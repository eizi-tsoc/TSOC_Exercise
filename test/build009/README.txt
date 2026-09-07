TSOC Exercise Web v2.1.0 / Build011
バックアップ復元ZIP読込修正 + 見えるバージョン更新

対象:
  test/build009/ のみ

上書き:
  admin.js
  admin.html
  index.html
  build-info.js

修正:
  - JSZip.loadAsync is not a function を修正
  - 管理画面・選択画面の表示を v2.1.0 / Build011 に更新
  - スクリプトURLのキャッシュバスターも Build011 に更新
  - 本番環境は変更しない

反映確認:
  GitHub Pages更新後、画面に「v2.1.0 / Build011」と表示されれば反映済みです。
