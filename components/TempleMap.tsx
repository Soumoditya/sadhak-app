import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind?: 'temple' | 'bhandara';
}

export interface TempleMapHandle {
  recenter: () => void;
  focus: (id: string) => void;
  fitAll: () => void;
}

interface Props {
  userLat: number;
  userLon: number;
  pins: MapPin[];
  selectedId?: string | null;
  isDark: boolean;
  onSelect: (id: string) => void;
  /** Map centre after the user pans/zooms (used to pin a new place). */
  onCenterChange?: (lat: number, lon: number) => void;
  /** The map could not start (e.g. no WebGL); the screen can fall back to a list. */
  onFail?: () => void;
}

// OpenStreetMap data rendered by MapLibre GL with OpenFreeMap vector tiles:
// free, no API key, no usage cap. (CARTO raster tiles, used before, started
// returning "API KEY REQUIRED" watermarks in Aug 2026, which blanked the map.)
// The page is built ONCE per user location/theme; pins and selection are pushed
// in afterwards so new results don't reload the map and reset the user's zoom.
export function buildHtml(userLat: number, userLon: number, isDark: boolean): string {
  const style = `https://tiles.openfreemap.org/styles/${isDark ? 'dark' : 'liberty'}`;
  const bg = isDark ? '#0B0E13' : '#EAE6DF';
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"/>
<style>
  html,body,#map{height:100%;width:100%;margin:0;padding:0;background:${bg}}
  .pin{width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;cursor:pointer}
  .pin>span{transform:rotate(45deg);font-size:14px;line-height:1}
  .pin.sel{width:40px;height:40px;border-width:3px;box-shadow:0 4px 12px rgba(0,0,0,.45)}
  .pin.sel>span{font-size:19px}
  .udot{width:16px;height:16px;border-radius:50%;background:#2E7DF6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(46,125,246,.22)}
  .maplibregl-ctrl-attrib{font-size:9px}
</style></head><body>
<div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
  function post(o){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(o));}
  var user=[${userLon},${userLat}], pins=[], markers={}, sel=null, fitted=false, map=null;
  try{
    map=new maplibregl.Map({container:'map',style:'${style}',center:user,zoom:13.5,attributionControl:false,pitchWithRotate:false,dragRotate:false});
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'© OpenStreetMap · OpenFreeMap'}),'top-left');
    var u=document.createElement('div');u.className='udot';
    new maplibregl.Marker({element:u}).setLngLat(user).addTo(map);
    map.on('moveend',function(){var c=map.getCenter();post({type:'center',lat:c.lat,lon:c.lng});});
    map.on('error',function(e){post({type:'maperror',msg:String(e&&e.error&&e.error.message||e)});});
  }catch(e){post({type:'fatal',msg:String(e&&e.message||e)});}
  function el(p){var d=document.createElement('div');var c=p.kind==='bhandara'?'#1B7A42':'#D94F00';d.className='pin'+(p.id===sel?' sel':'');d.style.background=c;d.innerHTML='<span>'+(p.kind==='bhandara'?'🍲':'🛕')+'</span>';d.addEventListener('click',function(ev){ev.stopPropagation();post({type:'select',id:p.id});});return d;}
  function setPins(list){
    if(!map)return;
    Object.keys(markers).forEach(function(k){markers[k].remove();});markers={};pins=list||[];
    pins.forEach(function(p){markers[p.id]=new maplibregl.Marker({element:el(p),anchor:'bottom'}).setLngLat([p.lon,p.lat]).addTo(map);});
    if(!fitted&&pins.length){fitAll();fitted=true;}
  }
  function setSel(id){
    var prev=sel;sel=id;
    [prev,id].forEach(function(k){var m=markers[k];if(!m)return;var e=m.getElement();e.classList.toggle('sel',k===sel);e.style.zIndex=k===sel?'10':'';});
  }
  function fitAll(){
    if(!map)return;
    var pts=pins.slice(0,25);
    if(!pts.length){map.easeTo({center:user,zoom:13.5});return;}
    var b=new maplibregl.LngLatBounds(user,user);pts.forEach(function(p){b.extend([p.lon,p.lat]);});
    map.fitBounds(b,{padding:{top:50,bottom:230,left:40,right:40},maxZoom:15,duration:600});
  }
  function focus(id){var p=pins.find(function(x){return x.id===id;});if(p&&map){map.easeTo({center:[p.lon,p.lat],zoom:Math.max(map.getZoom(),15.5),offset:[0,-80],duration:500});}}
  function recenter(){if(map)map.easeTo({center:user,zoom:15,duration:500});}
  post({type:'ready'});
</script></body></html>`;
}

const TempleMap = forwardRef<TempleMapHandle, Props>(({ userLat, userLon, pins, selectedId, isDark, onSelect, onCenterChange, onFail }, ref) => {
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const html = useMemo(() => buildHtml(userLat, userLon, isDark), [userLat, userLon, isDark]);
  const run = (js: string) => { if (ready.current) webRef.current?.injectJavaScript(`${js};true;`); };
  const pinsJson = JSON.stringify(pins.filter((p) => p.lat && p.lon));

  useEffect(() => { run(`setPins(${pinsJson})`); }, [pinsJson]);
  useEffect(() => { run(`setSel(${JSON.stringify(selectedId ?? null)})`); }, [selectedId]);
  // A rebuilt page (new location/theme) must wait for its own 'ready'.
  useEffect(() => { ready.current = false; }, [html]);

  useImperativeHandle(ref, () => ({
    recenter: () => run('recenter()'),
    focus: (id: string) => run(`focus(${JSON.stringify(id)})`),
    fitAll: () => run('fitAll()'),
  }));

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: isDark ? '#0B0E13' : '#EAE6DF' }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(e) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (d.type === 'ready') {
            ready.current = true;
            webRef.current?.injectJavaScript(`setPins(${pinsJson});setSel(${JSON.stringify(selectedId ?? null)});true;`);
          } else if (d.type === 'select' && d.id) onSelect(d.id);
          else if (d.type === 'center') onCenterChange?.(d.lat, d.lon);
          else if (d.type === 'fatal') onFail?.();
        } catch {}
      }}
    />
  );
});

export default TempleMap;
