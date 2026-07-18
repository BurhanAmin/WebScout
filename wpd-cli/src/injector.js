const fs = require('fs');
const path = require('path');

// Read the RUM script once when WPD starts
const rumScript = fs.readFileSync(
  path.join(__dirname, '..', '..', 'rum-script', 'rum.js'),
  'utf8'
);

function injectRumScript(html) {
  const tag = `<script>\n${rumScript}\n</script>`;
  if (html.includes('<head>')) {
    return html.replace('<head>', '<head>\n' + tag); // earliest, so fetch is patched first
  }
  if (html.includes('</body>')) {
    return html.replace('</body>', tag + '\n</body>');
  }
  return tag + html;
}

module.exports = { injectRumScript };