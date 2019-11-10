addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
  })
let header = {
    "Content-Type": "text/html; charset=utf-8",
}
var html = "<!DOCTYPE HTML><html lang='zh'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0,user-scalable=no'><meta name='theme-color' content='#009688'><meta http-equiv='x-dns-prefetch-control' content='on' /><title>jsproxy网页代理</title><link rel='dns-prefetch' href='https://jsproxy.wyj5211.workers.dev' /><link rel='stylesheet' href='https://cdn.bootcss.com/mdui/0.4.3/css/mdui.min.css'></head><body class='mdui-theme-primary-teal mdui-theme-accent-teal mdui-appbar-with-toolbar'><div class='mdui-appbar mdui-appbar-fixed'><div class='mdui-toolbar mdui-color-theme'><span class='mdui-typo-title mdui-text-color-white-text'>jsproxy网页代理</span></div></div><br><div class='mdui-container'><div class='mdui-textfield mdui-textfield-floating-label'><label class='mdui-textfield-label'>搜索或输入网址</label><input type='text' id='content' autofocus='autofocus' class='mdui-textfield-input' required='required'></div><button class='mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme' onclick='go()'>Go</button></div><br><script src='https://cdn.bootcss.com/mdui/0.4.3/js/mdui.min.js'></script><script>function go() {var value = document.getElementById('content').value;window.open('https://jsproxy.wyj5211.workers.dev/-----' + value);}</script></body></html>"
async function handleRequest(request) {
    return new Response(html, {status: 200,headers: header})
  }