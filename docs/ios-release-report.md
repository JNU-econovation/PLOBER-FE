# iOS Release Report

## API Integration

- Route recommendation is wired to `GET /api/v1/routes` with the current user location, `time=30`, and `mode=PLOGGING`.
- The route response is decoded from `encodedPath` and rendered as a Naver Map polyline.
- Trash photo analysis is called immediately after camera capture through `POST /api/plogging/analyze` as multipart form data.
- Existing S3 photo upload still runs in parallel with trash photo analysis, so analysis failures do not block the plogging flow.
- Trash hotspot tiles are loaded from `http://54.180.111.192:3000/predicted_hotspots/{z}/{x}/{y}`, decoded from MVT, and rendered as Naver polygon overlays.

## iOS Configuration

- `eas.json` now includes `development`, `preview`, and `production` build profiles.
- The current iOS bundle identifier remains `com.lewis.myproject`.
- Apple Sign In is enabled through `usesAppleSignIn`.
- Camera, photo library, location, and motion usage descriptions are configured in `app.config.js`.
- App Transport Security exceptions include the backend API host and hotspot tile host because both are currently HTTP endpoints.

## Verification Commands

Run these before a TestFlight build:

```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
npx eas-cli@latest build -p ios --profile preview
```

Current local verification:

- `npm run lint`: passed with 2 existing warnings.
- `npx tsc --noEmit`: passed.
- `npx expo-doctor`: passed, 17/17 checks.
- `npx expo export --platform web`: passed.
- Route API smoke test: `GET /api/v1/routes` returned 200 with `distanceMeter`, `timeMillis`, and `encodedPath`.
- Hotspot tile smoke test: current test coordinate tile returned 200 with MVT data.

For production:

```bash
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --profile production
```

## Remaining Manual Release Tasks

- Create or confirm the App Store Connect app record for bundle ID `com.lewis.myproject`.
- Configure Apple Developer team credentials with `npx eas-cli@latest credentials -p ios`.
- Add App Store metadata: app name, subtitle, description, keywords, support URL, privacy policy URL, screenshots, and age rating.
- Complete App Privacy details for location, photos, camera, motion, authentication, and any analytics actually used.
- Test the HTTP API endpoints on a physical iPhone build because ATS exceptions and native map overlays cannot be fully validated in web.
- Replace the temporary bundle identifier before public release if `com.lewis.myproject` is not the final production identifier.
