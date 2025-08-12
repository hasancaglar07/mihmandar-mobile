package com.mihmandarmobile

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity

class WebContentActivity : AppCompatActivity() {
  private lateinit var webView: WebView
  private lateinit var progressBar: ProgressBar

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val root = layoutInflater.inflate(R.layout.activity_webcontent, null)
    setContentView(root)

    title = intent.getStringExtra("title") ?: "İçerik"
    val url = intent.getStringExtra("url") ?: "https://mihmandar.org"

    webView = findViewById(R.id.webview)
    progressBar = findViewById(R.id.progress)

    val settings = webView.settings
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.loadsImagesAutomatically = true
    settings.cacheMode = WebSettings.LOAD_DEFAULT
    settings.loadWithOverviewMode = true
    settings.useWideViewPort = true
    settings.allowFileAccess = false
    settings.builtInZoomControls = false
    settings.displayZoomControls = false
    settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

    webView.webViewClient = object : WebViewClient() {
      override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        progressBar.visibility = View.VISIBLE
      }

      override fun onPageFinished(view: WebView?, url: String?) {
        progressBar.visibility = View.GONE
      }
    }

    webView.webChromeClient = object : WebChromeClient() {
      override fun onProgressChanged(view: WebView?, newProgress: Int) {
        progressBar.progress = newProgress
        progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
      }
    }

    webView.loadUrl(url)
  }

  override fun onBackPressed() {
    if (::webView.isInitialized && webView.canGoBack()) {
      webView.goBack()
    } else {
      super.onBackPressed()
    }
  }
}


