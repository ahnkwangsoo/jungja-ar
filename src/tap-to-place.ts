import * as ecs from '@8thwall/ecs'
import {Logo} from './logo'

const OBJECT_PLACED_EVENT = 'object-placed'

// 이미 배치된 건물을 찾기 위한 쿼리 (리셋 버튼과 동일한 방식)
const placedQuery = ecs.defineQuery([Logo])

ecs.registerComponent({
  name: 'tap-to-place',
  schema: {
    prefab: 'eid',
    faceCamera: 'boolean',  // 탭 시점의 카메라를 바라보게 회전
    yawDegrees: 'f32',      // 추가 회전 (faceCamera 켜면 그 위에 더해짐)
    offsetX: 'f32',         // 탭 지점 기준 X 오프셋 (m)
    offsetZ: 'f32',         // 탭 지점 기준 Z 오프셋 (m)
  },
  schemaDefaults: {
    faceCamera: true,
    yawDegrees: 0,
    offsetX: 0,
    offsetZ: 0,
  },
  stateMachine: ({world, eid, schemaAttribute, defineState}) => {
    defineState('initial').initial().listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
      if (!e.data.worldPosition) {
        return
      }
      const cfg = schemaAttribute.get(eid)

      // 탭할 때마다 새로 쌓이지 않도록 기존 배치본을 먼저 제거한다.
      // (템플릿 기본 동작은 탭마다 하나씩 추가돼 건물이 겹쳐 보였다)
      placedQuery(world).forEach((prev) => {
        world.deleteEntity(prev)
      })

      const newEid = world.createEntity(cfg.prefab)
      const newEntity = world.getEntity(newEid)

      const p = e.data.worldPosition
      newEntity.setLocalPosition({
        x: p.x + cfg.offsetX,
        y: p.y,
        z: p.z + cfg.offsetZ,
      })

      // 8th Wall 의 월드 축은 "세션 시작 시점"의 방향으로 고정된다.
      // 그래서 yaw 를 상수로 두면, 사용자가 몸을 돌린 뒤 탭했을 때
      // 건물이 시작 방향 기준으로 서기 때문에 옆쪽에 나타난다.
      // → 탭한 순간의 카메라 위치를 읽어 그쪽을 바라보게 회전시킨다.
      //   (모델 원점은 계단 앞이고 정면이 +Z 를 향하도록 익스포트돼 있다)
      let yaw = 0
      if (cfg.faceCamera) {
        try {
          const camEid = world.camera.getActiveEid()
          const c = camEid == null ? null : world.transform.getWorldPosition(camEid)
          if (c) {
            const dx = c.x - p.x
            const dz = c.z - p.z
            if (dx * dx + dz * dz > 1e-6) {
              const a = Math.atan2(dx, dz)
              if (isFinite(a)) {
                yaw = a
              }
            }
          }
        } catch (err) {
          yaw = 0  // 카메라를 못 읽으면 월드 기준 그대로 둔다
        }
      }
      yaw += (cfg.yawDegrees * Math.PI) / 180

      // 랜덤 회전 제거 — 건축물은 방향이 정해져 있어야 한다.
      newEntity.set(ecs.Quaternion, ecs.math.quat.yRadians(yaw))

      world.events.dispatch(eid, OBJECT_PLACED_EVENT)
    })
  },
})

export {
  OBJECT_PLACED_EVENT,
}
