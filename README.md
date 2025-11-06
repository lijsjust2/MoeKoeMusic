
<body>
<h3 id="h3--"><a name="# 核心特性" class="reference-link"></a><span class="header-link octicon octicon-link"></span># 核心特性</h3><p>🚀 自动化构建：仅通过 GitHub Action 生成 Docker 镜像，无需本地编译<br>📱 移动端适配：界面优化适配手机等移动设备，操作更便捷<br>📥 下载功能：支持音乐下载，可选音质</p>
<h3 id="h3-u955Cu50CFu4F7Fu7528u6B65u9AA4"><a name="镜像使用步骤" class="reference-link"></a><span class="header-link octicon octicon-link"></span>镜像使用步骤</h3><ol>
<li>下载 Docker 镜像<br>从 GitHub Releases 或 Action 构建产物中获取镜像文件（文件名格式：moekoemusic-&lt;commit-sha&gt;.tar）。</li><li>加载镜像到本地 Docker<br><code>docker load -i moekoemusic-&lt;commit-sha&gt;.tar</code><br>替换 &lt;commit-sha&gt; 为实际镜像文件中的 commit 哈希值（如 moekoemusic-abc123.tar）。</li><li><p>启动容器<br><code>docker run -d --name MoeKoeMusic -p 8080:8080 -p 6521:6521 moekoemusic:latest</code></p>
</li><li><p>访问服务<br>启动后，通过浏览器访问 <a href="http://你的服务器IP:8080">http://你的服务器IP:8080</a> 即可使用，移动端直接访问即可获得适配体验。</p>
</li></ol>
<h3 id="h3-u6CE8u610Fu4E8Bu9879"><a name="注意事项" class="reference-link"></a><span class="header-link octicon octicon-link"></span>注意事项</h3><ul>
<li>下载功能仅支持 128K 音质，如需其他音质可自行修改源码后重新构建</li><li>确保 Docker 环境已正确安装并运行</li><li>端口 8080、6521 未被其他服务占用，若已占用可修改映射端口（如 -p 8081:8080）</li></ul>
<h3 id="h3-u539Fu9879u76EE"><a name="原项目" class="reference-link"></a><span class="header-link octicon octicon-link"></span>原项目</h3><p>MoeKoe Music<br><a href="https://github.com/MoeKoeMusic/MoeKoeMusic">https://github.com/MoeKoeMusic/MoeKoeMusic</a></p>

</body>
</html>
