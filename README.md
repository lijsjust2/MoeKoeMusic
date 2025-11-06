<h1><a name="核心特性"></a><span></span>核心特性</h1>
<p>🚀 自动化构建：仅通过 GitHub Action 生成 Docker 镜像，无需本地编译<br>📱 移动端适配：界面优化适配手机等移动设备，操作更便捷<br>📥 下载功能：支持音乐下载，可选音质</p>
<h2><a name="镜像使用步骤"></a><span></span>镜像使用步骤</h2>
<p>下载 Docker 镜像<br>从 GitHub Releases 或 Action 构建产物中获取镜像文件（文件名格式：moekoemusic-&lt;xxx&gt;.tar）。<br>根据机器本身ARM或X86（AMD）下载镜像</p>
<p>加载镜像到本地 Docker<br><code>docker load -i moekoemusic-&lt;xxx&gt;.tar</code><br>替换 &lt;xxx&gt; 为实际镜像文件中的值（如 moekoemusic-202511062101.tar）。、<br>检查docker镜像是否加载<br><code>docker images</code><br>会输出加载好的镜像，注意对应的名字<br>启动容器，如果是AMD架构的<br><code>docker run -d --name MoeKoeMusic -p 8080:8080 -p 6521:6521 moekoemusic:latest-amd64</code><br>如果是ARM架构的<br><code>docker run -d --name MoeKoeMusic -p 8080:8080 -p 6521:6521 moekoemusic:latest-arm64</code></p>
<h3><a name="访问服务"></a><span></span>访问服务</h3>
<p>启动后，通过浏览器访问 <a href="http://你的服务器IP:8080">http://你的服务器IP:8080</a> 即可使用，移动端直接访问即可获得适配体验。</p>
<h3><a name="注意事项"></a><span></span>注意事项</h3>
<p>确保 Docker 环境已正确安装并运行<br>端口 8080、6521 未被其他服务占用，若已占用可修改映射端口（如 -p 8081:8080）<br>原项目<br>MoeKoe Music<br><a href="https://github.com/MoeKoeMusic/MoeKoeMusic">https://github.com/MoeKoeMusic/MoeKoeMusic</a></p>
