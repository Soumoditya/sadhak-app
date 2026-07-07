import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutInsets } from '../constants/layout';

// In-app PDF reader.
// The PDF is downloaded NATIVELY first (WebView fetches of remote PDFs die on
// CORS), then pdf.js renders the local file — which also makes reading offline.
const VIEWER_HTML = (bg: string, fg: string) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0"/>
<style>
  html,body{margin:0;padding:0;background:${bg}}
  #pages{display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0 30px}
  canvas{box-shadow:0 2px 14px rgba(0,0,0,.35);border-radius:4px;max-width:96vw;height:auto!important}
  #status{position:fixed;top:45%;left:0;right:0;text-align:center;color:${fg};font-family:sans-serif;font-size:14px}
</style></head><body>
<div id="status">Opening pages…</div>
<div id="pages"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  function post(o){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  if (!window.pdfjsLib) { post({type:'fatal', message:'pdf.js failed to load (no internet for first open)'}); }
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  fetch('sadhak-doc.pdf').then(function(r){ return r.arrayBuffer(); }).then(function(buf){
    return pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  }).then(function(pdf){
    post({type:'meta', pages: pdf.numPages});
    document.getElementById('status').style.display='none';
    var container = document.getElementById('pages');
    var targetW = window.innerWidth - 16;
    var renderPage = function(n){
      if (n > pdf.numPages) { post({type:'done'}); return; }
      pdf.getPage(n).then(function(page){
        var vw = page.getViewport({ scale: 1 });
        var s = targetW / vw.width;
        var viewport = page.getViewport({ scale: s * (window.devicePixelRatio || 1) });
        var canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.width = (viewport.width / (window.devicePixelRatio||1)) + 'px';
        container.appendChild(canvas);
        page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function(){
          renderPage(n + 1);
        });
      });
    };
    renderPage(1);
    window.addEventListener('scroll', function(){
      var canvases = container.querySelectorAll('canvas');
      if (!canvases.length) return;
      var mid = window.scrollY + window.innerHeight/2;
      var current = 1;
      for (var i=0;i<canvases.length;i++){
        var r = canvases[i].getBoundingClientRect();
        if (r.top + window.scrollY < mid) current = i+1;
      }
      post({type:'page', page: current});
    }, {passive:true});
  }).catch(function(e){
    post({type:'fatal', message: String(e && e.message || e)});
  });
</script></body></html>`;

export default function ReaderScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const { colors, isDark } = useTheme();
  const { headerPaddingTop, bottomInset } = useLayoutInsets();
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState<string | null>(null);
  const [phase, setPhase] = useState<'download' | 'render' | 'ready'>('download');
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!url) throw new Error('No document URL.');
        const dir = FileSystem.cacheDirectory + 'reader/';
        try { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } catch {}
        const pdfPath = dir + 'sadhak-doc.pdf';

        if (String(url).startsWith('file://')) {
          // Already local (opened from a download) — just copy alongside the viewer.
          try { await FileSystem.deleteAsync(pdfPath, { idempotent: true }); } catch {}
          await FileSystem.copyAsync({ from: String(url), to: pdfPath });
        } else {
          const dl = await FileSystem.downloadAsync(String(url), pdfPath);
          if (dl.status !== 200) throw new Error(`Download failed (HTTP ${dl.status}). Check your connection.`);
        }

        const htmlPath = dir + 'viewer.html';
        await FileSystem.writeAsStringAsync(htmlPath, VIEWER_HTML(isDark ? '#0B0E13' : '#F5F3F0', isDark ? '#8b8e94' : '#6b6b6b'));
        if (!cancelled) {
          setViewerUri(htmlPath);
          setPhase('render');
        }
      } catch (e: any) {
        if (!cancelled) setFailed(String(e?.message || e).slice(0, 200));
      }
    })();
    return () => { cancelled = true; };
  }, [url, isDark]);

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <View style={[st.topBar, { paddingTop: headerPaddingTop, backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => router.back()} style={[st.iconBtn, { backgroundColor: colors.background }]} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.title, { color: colors.text }]} numberOfLines={1}>{title || 'Reading'}</Text>
          {pages > 0 && <Text style={[st.pageInfo, { color: colors.textTertiary }]}>Page {page} of {pages}</Text>}
        </View>
        {!String(url || '').startsWith('file://') && (
          <TouchableOpacity onPress={() => Linking.openURL(String(url))} style={[st.iconBtn, { backgroundColor: colors.background }]} hitSlop={8}>
            <MaterialCommunityIcons name="open-in-new" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {failed ? (
        <View style={st.center}>
          <MaterialCommunityIcons name="file-alert-outline" size={44} color={colors.textTertiary} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 10 }}>Couldn't open this PDF</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 6, textAlign: 'center', paddingHorizontal: 36 }}>{failed}</Text>
          <TouchableOpacity style={[st.fallbackBtn, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(String(url))}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Open externally</Text>
          </TouchableOpacity>
        </View>
      ) : viewerUri ? (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: viewerUri }}
            style={{ flex: 1, backgroundColor: isDark ? '#0B0E13' : '#F5F3F0' }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            onMessage={(e) => {
              try {
                const d = JSON.parse(e.nativeEvent.data);
                if (d.type === 'meta') { setPages(d.pages); setPhase('ready'); }
                if (d.type === 'page') setPage(d.page);
                if (d.type === 'fatal') setFailed(String(d.message).slice(0, 200));
              } catch {}
            }}
            onError={() => setFailed('The reader failed to start.')}
          />
          {phase !== 'ready' && (
            <View style={[StyleSheet.absoluteFill, st.center, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 13 }}>Preparing pages…</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={st.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 13 }}>Downloading document…</Text>
        </View>
      )}
      <View style={{ height: bottomInset }} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 15.5, fontWeight: '700' },
  pageInfo: { fontSize: 11.5, marginTop: 1 },
  fallbackBtn: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12 },
});
