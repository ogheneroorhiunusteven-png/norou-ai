# Nova Exercise Coach v28: real 3D coach

## App fixes
- **Hub crashed on every screen.** `More.tsx` called a hook after an early return, so opening any Hub item threw "Rendered fewer hooks than expected". Fixed.
- **Nova OS orb did nothing.** It had no click handler. It now opens the Nova command centre.
- **Android build.** `minSdkVersion` raised 22 -> 26 (Health Connect requires 26).
- Task check-circle now has an accessible label.
- Click-tested: all 6 tabs and all 12 Hub screens (191 buttons, 0 errors), plus add/persist flows.

## Exercise Coach
The old coach was a flat 2D drawing/photo with a few rotated rectangles. It is replaced with a real 3D model:
- `src/lib/coach3d/` is a small dependency-free engine: skeleton + two-bone inverse kinematics, an anatomical muscle mannequin, equipment (barbell, plates, dumbbells, bench, racks, pull-up frame, cable tower) and a WebGL renderer.
- Every pose is solved from joint positions, so feet stay planted, limbs never stretch, the spine is a straight segment and the bar follows real constraints (e.g. the deadlift bar rides the shins/knees/thighs).
- Target muscles glow purple (primary/secondary/tertiary as in the reference sheet), with front/back target maps.
- Controls: play/pause, speed, targets, bar path, Front/Angle/Side, drag-to-rotate, reset view, scrub slider, previous/next phase, phase tabs, How-to steps, live joint angles, voice.
- Lunges alternate legs each rep.
- If a device has no WebGL, the old reference photo is shown instead.

## Posture verification
`npm run verify:coach` samples every exercise across its full range and checks 84 form rules (bar over mid-foot, no knee cave, neutral spine, chin over bar, no over-arching in the bridge, elbows pinned in curls and pushdowns, and so on). Run it after any change to `src/lib/coach3d/exercises.ts`.

## Honest limits
- This is a stylised mannequin, not photo-realistic artwork like the reference sheet.
- It is a guide based on standard coaching technique. It cannot see your body, mobility, load or equipment and cannot guarantee injury prevention. Start light and get a qualified coach to check your form.
