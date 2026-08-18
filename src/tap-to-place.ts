import * as ecs from '@8thwall/ecs'
import {Logo} from './logo'

const OBJECT_PLACED_EVENT = 'object-placed'

// 이미 배치된 건물을 찾기 위한 쿼리 (리셋 버튼과 동일한 방식)
const placedQuery = ecs.defineQuery([Logo])

ecs.registerComponent({
  name: 'tap-to-place',
  schema: {
    prefab: 'eid',
    yawDegrees: 'f32',   // 건물 방향 (0 = 원본 방향, 90 = 시계방향 90도)
    offsetX: 'f32',      // 탭 지점 기준 X 오프셋 (m)
    offsetZ: 'f32',      // 탭 지점 기준 Z 오프셋 (m)
  },
  schemaDefaults: {
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

      // 랜덤 회전 제거 — 건축물은 방향이 정해져 있어야 한다.
      newEntity.set(ecs.Quaternion, ecs.math.quat.yRadians((cfg.yawDegrees * Math.PI) / 180))

      world.events.dispatch(eid, OBJECT_PLACED_EVENT)
    })
  },
})

export {
  OBJECT_PLACED_EVENT,
}
