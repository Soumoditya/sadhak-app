import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
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
}

interface Props {
  userLat: number;
  userLon: number;
  pins: MapPin[];
  isDark: boolean;
  onSelect: (id: string) => void;
}

// Free OpenStreetMap map (Leaflet + Carto tiles) rendered inside a WebView.
// No API key, no billing — fully free and location-aware.
function buildHtml(userLat: number, userLon: number, pins: MapPin[], isDark: boolean): string {
  const tiles = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png';
  const data = JSON.stringify(pins.filter((p) => p.lat && p.lon));
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;width:100%;margin:0;padding:0;background:${isDark ? '#0B0E13' : '#EAE6DF'}}
  .pin{width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
  .pin>span{transform:rotate(45deg);font-size:14px}
  .udot{width:16px;height:16px;border-radius:50%;background:#2E7DF6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(46,125,246,.25)}
  .leaflet-control-attribution{display:none}
  /* Theme the zoom +/- controls so they don't glare white on the dark map */
  .leaflet-bar a,.leaflet-bar a:link{background:${isDark ? '#171C24' : '#FFFFFF'};color:${isDark ? '#E8E6E1' : '#222222'};border-bottom-color:${isDark ? '#2A3140' : '#DDDDDD'}}
  .leaflet-bar a:hover{background:${isDark ? '#212833' : '#F4F4F4'}}
  .leaflet-bar{border:1px solid ${isDark ? '#2A3140' : '#DDDDDD'};box-shadow:0 2px 8px rgba(0,0,0,.35)}
</style></head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var user=[${userLat},${userLon}];
  var pins=${data};
  var map=L.map('map',{zoomControl:true,attributionControl:false}).setView(user,14);
  L.tileLayer('${tiles}',{maxZoom:19,subdomains:'abcd'}).addTo(map);
  var uicon=L.divIcon({className:'',html:'<div class="udot"></div>',iconSize:[16,16],iconAnchor:[8,8]});
  L.marker(user,{icon:uicon,zIndexOffset:1000}).addTo(map);
  function pinIcon(kind){var c=kind==='bhandara'?'#1B7A42':'#D94F00';var e=kind==='bhandara'?'🍲':'🛕';return L.divIcon({className:'',html:'<div class="pin" style="background:'+c+'"><span>'+e+'</span></div>',iconSize:[30,30],iconAnchor:[15,30]});}
  var pts=[user];
  pins.forEach(function(p){var m=L.marker([p.lat,p.lon],{icon:pinIcon(p.kind)}).addTo(map);m.on('click',function(){post({type:'select',id:p.id});});pts.push([p.lat,p.lon]);});
  if(pts.length>1){try{map.fitBounds(pts,{padding:[50,50],maxZoom:15});}catch(e){}}
  function post(o){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(o));}
  function handle(e){try{var d=JSON.parse(e.data);if(d.type==='recenter'){map.setView(user,15);}if(d.type==='focus'){var t=pins.find(function(x){return x.id===d.id;});if(t)map.setView([t.lat,t.lon],16);}}catch(_){} }
  document.addEventListener('message',handle);window.addEventListener('message',handle);
  post({type:'ready'});
</script></body></html>`;
}

const TempleMap = forwardRef<TempleMapHandle, Props>(({ userLat, userLon, pins, isDark, onSelect }, ref) => {
  const webRef = useRef<WebView>(null);
  const html = useMemo(() => buildHtml(userLat, userLon, pins, isDark), [userLat, userLon, pins, isDark]);

  useImperativeHandle(ref, () => ({
    recenter: () => webRef.current?.injectJavaScript(`handle({data:JSON.stringify({type:'recenter'})});true;`),
    focus: (id: string) => webRef.current?.injectJavaScript(`handle({data:JSON.stringify({type:'focus',id:'${id}'})});true;`),
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
          if (d.type === 'select' && d.id) onSelect(d.id);
        } catch {}
      }}
    />
  );
});

export default TempleMap;
