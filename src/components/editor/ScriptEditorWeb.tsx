/**
 * Optional WebView-hosted CodeMirror 6 editor for a richer IDE experience.
 *
 * Usage (swap into ScriptEditor on iOS/Android when you want syntax highlight):
 *   <ScriptEditorWeb source={draft} onChange={setDraft} />
 *
 * The HTML bundle is self-contained (CDN CodeMirror) so it works offline only
 * after first cache. For fully offline, vendor the CM assets under /assets/cm.
 */
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '../../theme';

interface Props {
  source: string;
  onChange: (next: string) => void;
  onRun?: () => void;
}

const HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/material-darker.min.css"/>
<style>
  html, body, #host { margin:0; height:100%; background:#1e1e1e; }
  .CodeMirror { height:100%; font-size:13px; font-family: Menlo, monospace; }
</style>
</head>
<body>
<div id="host"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"></script>
<script>
  const editor = CodeMirror(document.getElementById('host'), {
    value: '',
    mode: 'javascript',
    theme: 'material-darker',
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: false,
    extraKeys: {
      'Cmd-Enter': () => window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'run' })),
      'Ctrl-Enter': () => window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'run' })),
    }
  });
  editor.on('change', () => {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', value: editor.getValue() }));
  });
  function setValue(v) {
    const cur = editor.getValue();
    if (cur !== v) {
      const pos = editor.getCursor();
      editor.setValue(v);
      editor.setCursor(pos);
    }
  }
  document.addEventListener('message', (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'set') setValue(msg.value || '');
    } catch {}
  });
  // Android
  window.addEventListener('message', (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'set') setValue(msg.value || '');
    } catch {}
  });
</script>
</body>
</html>
`;

export function ScriptEditorWeb({ source, onChange, onRun }: Props) {
  const ref = useRef<WebView>(null);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; value?: string };
      if (msg.type === 'change' && typeof msg.value === 'string') onChange(msg.value);
      if (msg.type === 'run') onRun?.();
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.wrap}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: HTML }}
        onMessage={onMessage}
        onLoadEnd={() => {
          ref.current?.postMessage(JSON.stringify({ type: 'set', value: source }));
        }}
        style={styles.web}
        allowFileAccess
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.editor.bg },
  web: { flex: 1, backgroundColor: colors.editor.bg },
});

export default ScriptEditorWeb;
