package com.example.iptv

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
	@SuppressLint("SetJavaScriptEnabled")
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)

		val webView = WebView(this)
		setContentView(webView)

		val settings: WebSettings = webView.settings
		settings.javaScriptEnabled = true
		settings.domStorageEnabled = true
		settings.mediaPlaybackRequiresUserGesture = false
		settings.allowFileAccessFromFileURLs = true
		settings.allowUniversalAccessFromFileURLs = true
		settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
		settings.loadsImagesAutomatically = true

		webView.webChromeClient = WebChromeClient()
		webView.webViewClient = object : WebViewClient() {
			override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
				return false
			}
		}

		// Load local HTML asset
		webView.loadUrl("file:///android_asset/index.html")
	}

	override fun onBackPressed() {
		val webView = (this.findViewById(android.R.id.content) as? android.view.ViewGroup)?.getChildAt(0) as? WebView
		if (webView != null && webView.canGoBack()) {
			webView.goBack()
		} else {
			super.onBackPressed()
		}
	}
}