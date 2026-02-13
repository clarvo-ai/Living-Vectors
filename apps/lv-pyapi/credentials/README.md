# Google Cloud Credentials

To enable fetching data from GCS, you need to set up the `GOOGLE_APPLICATION_CREDENTIALS`.

1. Go to the project's [Google Cloud Console Secret Manager](https://console.cloud.google.com/security/secret-manager?hl=fi&project=swp-livingvectors).
2. Get the secret value.
3. Create a new file named `google-credentials.json` in this directory (`./apps/lv-pyapi/credentials/google-credentials.json`)
4. Paste the secret value into that file.
