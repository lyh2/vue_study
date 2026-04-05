# target_delta 同步机制深度解析

## 核心问题：为什么相机不会跟随角色？

### ❌ 如果直接修改 `controls.target` 会怎样？

```javascript
// 简单做法（错误）
this.look_target.lerp(this.look_target_position, 0.4);
this.controls.target.copy(this.look_target);
// ❌ 相机会突然跳跃！旋转轴瞬间移动
```

**问题原因**：OrbitControls 有内部的相机-目标关系：

```
OrbitControls 内部逻辑：
camera.position = target + 相对偏移向量(distance, angle)
                           ↑
                    这个偏移向量是固定的，记录了鼠标旋转的状态
```

当只改变 `target` 而不改变 `camera.position` 时：

```
T0 时刻：
├─ controls.target = (0, 2.2, 0)
├─ camera.position = (2, 3.8, -3)     ← 相距√13
└─ 鼠标旋转偏移 = (2, 1.6, -3)

T1 时刻（只改target）：
├─ controls.target = (0, 2.2, 0.5)    ← 角色前进了0.5
├─ camera.position = (2, 3.8, -3)     ← 没变！
└─ ❌ 相机和target的距离变了！相机会被拉扯！
```

---

## ✅ 正确做法：同步移动

```javascript
// 第345行：计算target的移动增量
this.target_delta.copy(this.look_target).sub(this.controls.target);
                     ↑新位置                ↑旧位置
                     = 移动了多少

// 第346行：相机也平移相同增量
this.perspectiveCamera.position.add(this.target_delta);
                                   ↑保持距离关系

// 第347行：更新OrbitControls的旋转中心
this.controls.target.copy(this.look_target);
```

### 时间序列演示

```
T0 时刻（初始化）：
├─ look_target = (0, 2.2, 0)
├─ controls.target = (0, 2.2, 0)
├─ camera.position = (2, 3.8, -3)
└─ 鼠标拉动相机绕target旋转 ✅

T1 时刻（角色前进0.5单位）：
├─ look_target_position = (0.5, 2.2, 0)  ← 新位置
├─ look_target.lerp(...) → (0.2, 2.2, 0)  ← 平滑后
│
├─ 计算delta:
│  target_delta = (0.2, 2.2, 0) - (0, 2.2, 0) = (0.2, 0, 0)
│
├─ 相机同步移动:
│  camera.position = (2, 3.8, -3) + (0.2, 0, 0) = (2.2, 3.8, -3) ✅
│
└─ 更新target:
   controls.target = (0.2, 2.2, 0)

结果：
├─ 相机和target的距离仍然是 (2, 1.6, -3)
├─ ✅ 相机平滑跟随角色
├─ ✅ 鼠标旋转仍然有效（距离关系保持）
└─ ✅ 没有跳跃！
```

---

## 为什么需要三步操作？

### 步骤1：计算移动增量

```javascript
this.target_delta.copy(this.look_target).sub(this.controls.target);
```

**作用**：测量 `look_target` 这一帧移动了多少

```
  旧的controls.target (0, 2.2, 0)
        ↑
        ← target_delta = (0.2, 0, 0) →
        ↓
  新的look_target (0.2, 2.2, 0)
```

### 步骤2：相机位置同步

```javascript
this.perspectiveCamera.position.add(this.target_delta);
```

**作用**：相机位置也跟着移动相同的增量

```
相机旋转时的相对关系是固定的：
camera = target + 相对向量(distance, angle)

所以当target移动时，camera必须也移动，来保持这个"相对向量"不变

camera.position += target_delta
(2, 3.8, -3) + (0.2, 0, 0) = (2.2, 3.8, -3) ✅
```

### 步骤3：更新旋转中心

```javascript
this.controls.target.copy(this.look_target);
```

**作用**：告诉OrbitControls新的旋转中心在哪

```
OrbitControls内部记录：
├─ this.target = (0.2, 2.2, 0)     ← 新的旋转中心
├─ camera.position = (2.2, 3.8, -3) ← 新的相机位置
├─ 两者的相对关系 = (2, 1.6, -3)
└─ 下一帧还是用这个相对关系继续旋转
```

---

## 对比：有target_delta vs 没有

### ❌ 场景A：如果没有第346行（不同步相机位置）

```javascript
// 只有3行，缺了第346行
this.target_delta.copy(this.look_target).sub(this.controls.target);
// this.perspectiveCamera.position.add(this.target_delta);  ← 注释掉
this.controls.target.copy(this.look_target);
```

**后果**：

```
T0: target=(0,2.2,0), camera=(2,3.8,-3)
T1: ✅ target移动到(0.2,2.2,0)
    ❌ camera仍在(2,3.8,-3)

结果：相机仍在原地，但旋转中心跑了
     →相机被拉向新的target，产生诡异的"弹簧效应"
```

### ❌ 场景B：如果没有第345行（不计算delta）

```javascript
// 直接修改target
this.perspectiveCamera.position = this.look_target + some_offset;
this.controls.target = this.look_target;
```

**后果**：

```
每次target改变，相机都会：
1. 跳到新位置
2. OrbitControls的旋转状态被重置
3. 鼠标旋转失效（因为offset计算不对）
```

### ✅ 场景C：完整的三步操作（正确）

```javascript
this.target_delta = new_target - old_target; // 计算移动量
this.perspectiveCamera.position += target_delta; // 相机同步平移
this.controls.target = new_target; // 更新旋转中心
```

**结果**：

```
✅ 相机平滑跟随look_target
✅ 相机和target的距离保持不变
✅ 鼠标旋转继续有效
✅ 没有跳跃和抖动
```

---

## 用更直观的方式理解

### 想象场景：父亲和儿子

```
父亲在走路（角色移动）
└─ 儿子坐在父亲的肩膀上（相机相对于target）

如果父亲走动时：
❌ 只改变"父亲的位置"，不改变"儿子的位置"
   → 儿子会从肩膀上掉下来！

✅ 父亲的身体移动，儿子也跟着移动相同的距离
   → 儿子始终坐在肩膀上，一起前进
```

这就是为什么需要：

```javascript
camera.position.add(target_delta); // 儿子(相机)跟着父亲(target)移动
```

---

## OrbitControls的工作原理简图

```
┌─ OrbitControls 的内部状态 ──────────────────┐
│                                              │
│  ○── relative_offset = (2, 1.6, -3)         │
│  │    (记录了鼠标旋转造成的偏移)              │
│  │                                           │
│  ├─ target = (x, y, z)  ← 旋转中心          │
│  │                                           │
│  └─ camera.position = target + relative_offset
│                          ↑ 每次都这样计算
│
│ 当鼠标移动时：
│  → relative_offset改变（旋转角度变化）
│  → camera.position重新计算
│
│ 当target改变时：
│  → 如果相机不跟着移动
│  → relative_offset就会变大/变小
│  → 旋转就会产生"拉扯"效果
└──────────────────────────────────────────┘
```

---

## 核心总结：为什么要这样做？

| 操作                                           | 为了                    | 后果                   |
| ---------------------------------------------- | ----------------------- | ---------------------- |
| `target_delta = look_target - controls.target` | 测量目标点的移动距离    | 知道要移动多少         |
| `camera.position += target_delta`              | 相机也平移相同距离      | 保持与target的相对位置 |
| `controls.target = look_target`                | 告诉OrbitControls新中心 | 下一帧继续以新中心旋转 |

**一句话**：相机要跟着角色，但同时还要支持鼠标旋转 → 必须同时更新**相机位置**和**旋转中心**，否则一个会变而另一个不变，就会产生问题。
