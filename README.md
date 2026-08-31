# TSOC Exercise Web v1.2.0

TSOC Exercise のWeb移植・再構築版です。

## 公開
GitHub Pages で `main` / `/(root)` を公開対象にします。

## データ
- `data/exercise-data.js`: 運動マスター、カテゴリー、画像、QR
- `data/app-config.js`: 回数/時間・セット数など運用設定

## 仕様・変更履歴
- `SYSTEM_SPEC.md`: 現行仕様と移植方針
- `TEST_CHECKLIST.md`: 回帰・受入確認項目
- `CHANGELOG.md`: バージョンごとの変更点
- `VERSION.md`: 現在バージョン

## 注意
患者情報はGitHubへ保存しません。ブラウザ上で入力した患者名は印刷/PDF生成にのみ使用します。
