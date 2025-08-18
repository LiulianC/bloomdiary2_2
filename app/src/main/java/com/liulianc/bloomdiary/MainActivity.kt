package com.liulianc.bloomdiary

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.content.FileProvider
import java.io.File

class MainActivity : ComponentActivity() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this)
        setContentView(webView)

        // 允许 Chrome 连接 DevTools 调试
        WebView.setWebContentsDebuggingEnabled(true)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            loadsImagesAutomatically = true
            databaseEnabled = true
        }

        // 控制台日志进 Logcat
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(cm: ConsoleMessage?): Boolean {
                if (cm != null) {
                    Log.d("WebViewConsole", "${cm.message()} @${cm.sourceId()}:${cm.lineNumber()}")
                }
                return true
            }
        }

        // 拦截 intent://、weixin:// 等未知协议，避免 ERR_UNKNOWN_URL_SCHEME
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url?.toString() ?: return false
                if (url.startsWith("intent:") || url.startsWith("weixin://")) {
                    return try {
                        val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                        val chooser = Intent.createChooser(intent, "选择应用打开")
                        startActivity(chooser)
                        true
                    } catch (e: Exception) {
                        Log.w("WebView", "无法处理外部协议: $url, $e")
                        true // 吃掉，避免跳到错误页
                    }
                }
                return false
            }
        }

        // 注入 JS 接口：AndroidShare
        webView.addJavascriptInterface(ShareBridge(), "AndroidShare")

        // 加载前端资源：把你的 index.html 与静态文件放到 app/src/main/assets/
        webView.loadUrl("file:///android_asset/index.html")
        // 如需加载线上：
        // webView.loadUrl("https://你的域名/index.html")
        // 本机调试（模拟器）：http://10.0.2.2:端口/
    }

    inner class ShareBridge {

        // 分享纯文本
        @JavascriptInterface
        fun shareText(title: String?, text: String) {
            try {
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title ?: "分享")
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(Intent.createChooser(intent, "分享至"))
            } catch (e: ActivityNotFoundException) {
                Log.w("ShareBridge", "无可用分享目标: $e")
            }
        }

        // 以 Base64 接收文件内容，写入缓存并分享给外部 App（如微信）
        @JavascriptInterface
        fun shareFileBase64(base64: String, mime: String, filename: String) {
            try {
                val bytes = Base64.decode(base64, Base64.DEFAULT)

                // 存到应用缓存/shared/ 下（FileProvider 已授权）
                val dir = File(cacheDir, "shared").apply { if (!exists()) mkdirs() }
                val outFile = File(dir, sanitize(filename))
                outFile.writeBytes(bytes)

                val uri: Uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "${applicationContext.packageName}.fileprovider",
                    outFile
                )

                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = if (mime.isNotBlank()) mime else "application/octet-stream"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                // 广授读权限（部分目标 App 解析慢）
                grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)

                startActivity(Intent.createChooser(intent, "分享文件"))
            } catch (e: Exception) {
                Log.e("ShareBridge", "分享文件失败", e)
            }
        }

        private fun sanitize(name: String): String {
            return name.replace(Regex("[\\\\/:*?\"<>|]"), "_")
        }
    }
}