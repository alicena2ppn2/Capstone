// app.json 설정을 그대로 쓰고, git에 올리면 안 되는 키만 빌드할 때 환경변수에서 넣는다.
// GOOGLE_MAPS_ANDROID_KEY: Android 지도(react-native-maps → Google 지도)용 키. EAS 환경변수나 mobile/.env.local(git 제외)에 둔다.
// iPhone은 Apple 지도를 써서 키가 필요 없다. 키가 없으면 Android 지도는 회색 빈 화면이 된다 (장소 목록은 그대로 보임).
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', process.env.GOOGLE_MAPS_ANDROID_KEY ? { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } : {}],
  ],
});
