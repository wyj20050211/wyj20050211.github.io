var authConfig = {
    "siteName": "GoIndex",
    "client_id": "202264815644.apps.googleusercontent.com",
    "client_secret": "X4Z3ca8xfWDb1Voo-F9a7ZxJ",
    "refresh_token": "1/lV3KCzS9U6RyQR_jTBiofCcbEJTnITnGNgacrhFkRZx5jmKgih2Bxldy72RqcuLp",
    "root": "1bExvEZsyGdiLsQN_sYIM1dJhI-yh5tbg"
};

var gd;

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
    if(gd == undefined){
      gd = new googleDrive(authConfig);
    }

    // if(request.method == 'POST'){
    //   return apiRequest(request);
    // }

    let url = new URL(request.url);
    let path = url.pathname;

    if(path.substr(-1) == '/'){
      let list = await gd.list(path);
      let v = new view();
      let html = v.list(path, list);
      return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
    }else{
      let file = await gd.file(path);
      let range = request.headers.get('Range');
      return gd.down(file.id, range);
      return new Response(JSON.stringify(file));
    }
}

class googleDrive {
    constructor(authConfig) {
        this.authConfig = authConfig;
        this.paths = [];
        this.files = [];
        this.paths["/"] = authConfig.root;
        this.accessToken();
    }

    async down(id, range=''){
      let url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
      let requestOption = await this.requestOption();
      requestOption.headers['Range'] = range;
      return await fetch(url, requestOption);
    }

    async file(path){
      if(typeof this.files[path] == 'undefined'){
        this.files[path]  = await this._file(path);
      }
      return this.files[path] ;
    }

    async _file(path){
      let arr = path.split('/');
      let name = arr.pop();
      name = decodeURIComponent(name);
      let dir = arr.join('/')+'/';
      console.log(name, dir);
      let parent = await this.findPathId(dir);
      console.log(parent);
      let url = 'https://www.googleapis.com/drive/v3/files';
      let params = {'includeItemsFromAllDrives':true,'supportsAllDrives':true};
      params.q = `'${parent}' in parents and name = '${name}' andtrashed = false`;
      params.fields = "files(id, name, mimeType, size ,createdTime, modifiedTime, iconLink, thumbnailLink)";
      url += '?'+this.enQuery(params);
      let requestOption = await this.requestOption();
      let response = await fetch(url, requestOption);
      let obj = await response.json();
      console.log(obj);
      return obj.files[0];
    }

    // 通过reqeust cache 来缓存
    async list(path){
      let id = await this.findPathId(path);
      return this._ls(id);
    }

    async _ls(parent){
      console.log("_ls",parent);

      if(parent==undefined){
        return null;
      }
      let url = 'https://www.googleapis.com/drive/v3/files';
      let params = {'includeItemsFromAllDrives':true,'supportsAllDrives':true};
      params.q = `'${parent}' in parents and trashed = false`;
      params.orderBy= 'folder,modifiedTime desc,name';
      params.fields = "nextPageToken, files(id, name, mimeType, size , modifiedTime)";
      params.pageSize = 1000;
      url += '?'+this.enQuery(params);
      let requestOption = await this.requestOption();
      let response = await fetch(url, requestOption);
      let obj = await response.json();
      return obj;
    }

    async findPathId(path){
      let c_path = '/';
      let c_id = this.paths[c_path];

      let arr = path.trim('/').split('/');
      for(let name of arr){
        c_path += name+'/';

        if(typeof this.paths[c_path] == 'undefined'){
          let id = await this._findDirId(c_id, name);
          this.paths[c_path] = id;
        }

        c_id = this.paths[c_path];
        if(c_id == undefined || c_id == null){
          break;
        }
      }
      console.log(this.paths);
      return this.paths[path];
    }

    async _findDirId(parent, name){
      name = decodeURIComponent(name);
      
      console.log("_findDirId",parent,name);

      if(parent==undefined){
        return null;
      }

      let url = 'https://www.googleapis.com/drive/v3/files';
      let params = {'includeItemsFromAllDrives':true,'supportsAllDrives':true};
      params.q = `'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${name}'  and trashed = false`;
      params.fields = "nextPageToken, files(id, name, mimeType)";
      url += '?'+this.enQuery(params);
      let requestOption = await this.requestOption();
      let response = await fetch(url, requestOption);
      let obj = await response.json();
      if(obj.files[0] == undefined){
        return null;
      }
      return obj.files[0].id;
    }

    async accessToken(){
      console.log("accessToken");
      if(this.authConfig.expires == undefined  ||this.authConfig.expires< Date.now()){
        const obj = await this.fetchAccessToken();
        if(obj.access_token != undefined){
          this.authConfig.accessToken = obj.access_token;
          this.authConfig.expires = Date.now()+3500*1000;
        }
      }
      return this.authConfig.accessToken;
    }

    async fetchAccessToken() {
        console.log("fetchAccessToken");
        const url = "https://www.googleapis.com/oauth2/v4/token";
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        const post_data = {
            'client_id': this.authConfig.client_id,
            'client_secret': this.authConfig.client_secret,
            'refresh_token': this.authConfig.refresh_token,
            'grant_type': 'refresh_token'
        }

        let requestOption = {
            'method': 'POST',
            'headers': headers,
            'body': this.enQuery(post_data)
        };

        const response = await fetch(url, requestOption);
        return await response.json();
    }

    async fetch200(url, requestOption) {
        let response;
        for (let i = 0; i < 3; i++) {
            response = await fetch(url, requestOption);
            console.log(response.status);
            if (response.status != 403) {
                break;
            }
            await this.sleep(800 * (i + 1));
        }
        return response;
    }

    async requestOption(headers={},method='GET'){
      const accessToken = await this.accessToken();
      headers['authorization'] = 'Bearer '+ accessToken;
      return {'method': method, 'headers':headers};
    }

    enQuery(data) {
        const ret = [];
        for (let d in data) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
        }
        return ret.join('&');
    }

    sleep(ms) {
        return new Promise(function (resolve, reject) {
            let i = 0;
            setTimeout(function () {
                console.log('sleep' + ms);
                i++;
                if (i >= 2) reject(new Error('i>=2'));
                else resolve(i);
            }, ms);
        })
    }
}

class view{

  nav(path){
    let html = ``;
    let arr = path.trim('/').split('/');
    var p = '/';
    if(arr.length > 0){
      for(let n of arr){
        p += n+'/';
        if(n == ''){
          break;
        }
	n = decodeURIComponent(n);
        html += `<i class="mdui-icon material-icons mdui-right" style="margin:0;">chevron_right</i>
        <a href="${p}" class="mdui-typo-title mdui-text-color-white-text">${n}</a>`;
      }
    }
		return html;
  }

  ls(path, items){
    let html = `<div class="mdui-row">
	<ul class="mdui-list">
		<li class="mdui-list-item th">
		  <div class="mdui-col-xs-12 mdui-col-sm-7">文件</div>
		</li>`;
    
    for(let item of items){
      console.log(item);
      let p = path+item.name+'/';
      let d = new Date(item['modifiedTime']);
      if(item['size']==undefined){
        item['size'] = "";
      }
      if(item['mimeType'] == 'application/vnd.google-apps.folder'){
        html +=`<li class="mdui-list-item mdui-ripple"><a href="${p}">
              <div class="mdui-col-xs-12 mdui-col-sm-7 mdui-text-truncate">
              <i class="mdui-icon material-icons">folder_open</i>
                ${item.name}
              </div>
              </a>
          </li>`;
      }else{
        let p = path+item.name;
        html += `<li class="mdui-list-item file mdui-ripple" target="_blank"><a href="${p}">
            <div class="mdui-col-xs-12 mdui-col-sm-7 mdui-text-truncate">
            <i class="mdui-icon material-icons">insert_drive_file</i>
              ${item.name}
            </div>
            </a>
        </li>`;
      }

    }

    html += `	</ul></div>`;
    return html;
  }

  list(path, items){
    let siteName = authConfig.siteName;
    let title = `${siteName} - ${path}`;
    let nav = this.nav(path);
    let content = this.ls(path,items.files);
    return this.layout(title, siteName, nav, content);
  }

  layout(title,siteName,nav,content){
    title = decodeURIComponent(title);
    return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0,maximum-scale=1.0, user-scalable=no"/>
	<meta name="theme-color" content="#2196f3">
	<title>${title}</title>
  <link rel="shortcut icon" href="https://cdn.jsdelivr.net/gh/wyj20050211/cdn/img/gd.ico" />
	<link rel="stylesheet" href="https://cdn.bootcss.com/mdui/0.4.3/css/mdui.min.css">
	<script src="https://cdn.bootcss.com/mdui/0.4.3/js/mdui.min.js"></script>

  <style>
  		.mdui-list-item>a{
			width:100%;
			line-height: 48px
		}
		.mdui-list-item{
			margin: 2px 0px;
			padding:0;
		}
    .mdui-right{
      color: #fff !important;
    }
  </style>
</head>
<body class="mdui-theme-primary-blue mdui-theme-accent-blue mdui-appbar-with-toolbar">
	<header class="mdui-appbar mdui-appbar-fixed">
		<div class="mdui-toolbar mdui-color-theme">
			<a href="/" class="mdui-typo-title mdui-text-color-white-text">${siteName}</a>
			${nav}
			
		</div>
	</header>
	<div class="mdui-container">
    	${content}
  	</div>
  	<script src="//instant.page/2.0.0" type="module" defer integrity="sha384-D7B5eODAUd397+f4zNFAVlnDNDtO1ppV8rPnfygILQXhqu3cUndgHvlcJR2Bhig8"></script>
</body>
</html>`;
  }
}

String.prototype.trim = function (char) {
    if (char) {
        return this.replace(new RegExp('^\\'+char+'+|\\'+char+'+$', 'g'), '');
    }
    return this.replace(/^\s+|\s+$/g, '');
};