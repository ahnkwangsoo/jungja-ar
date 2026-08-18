const onxrloaded = () => {
  // 실물 1:1 배치용 설정.
  // 기본값 scale:'responsive'는 월드 단위가 미터에 고정되지 않아
  // 건물 크기가 실제와 어긋나고, 다가가면 모델이 따라오는 것처럼 보인다.
  // 'absolute'로 두어야 1 unit = 1 m 로 고정되고 바닥에 붙어 있게 된다.
  XR8.XrController.configure({
    scale: 'absolute',
    disableWorldTracking: false,
  })

  XR8.addCameraPipelineModule(LandingPage.pipelineModule())
  LandingPage.configure({
    mediaSrc: './assets/preview.jpg'
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
