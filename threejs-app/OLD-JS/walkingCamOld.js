
function updateWalkingCamera() {
  if (!OPT_WALK) return;

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(camera.up, dir).normalize();

  let move = new THREE.Vector3();

  if (keyState['i']) move.add(dir);
  if (keyState['k']) move.sub(dir);
  if (keyState['j']) move.add(right);
  if (keyState['l']) move.sub(right);

  // 🔁 Rotation with Q/E or arrows
  if (keyState['arrowleft'] || keyState['u']) camera.rotation.y += rotateSpeed;
  if (keyState['arrowright'] || keyState['o']) camera.rotation.y -= rotateSpeed;

  if (move.lengthSq() > 0) {
    move.normalize();

    // Check if Shift is held
    const isSprinting = keyState['shift'];
    const currentSpeed = baseSpeed * (isSprinting ? sprintMultiplier : 1);

    move.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
    move.multiplyScalar(currentSpeed);

    camera.position.add(move);

    const y = getHeightAt(camera.position.x, camera.position.z) + eyeLevel;
    camera.position.y = y;

    const lookTarget = camera.position.clone().add(new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation));
    camera.lookAt(lookTarget);
  }
}



let OPT_WALK = false;
updateWalkingCamera();



window.setCameraView = function(viewName) {
  const view = views[viewName];
  if (!view) return;

  let camX = ( view[0]/100 - .5) * OPT_SIZE
  let camZ = ( -view[1]/100 + .5) * OPT_SIZE
  lookX = ( view[2]/100 - .5) * OPT_SIZE
  lookZ = ( -view[3]/100 + .5) * OPT_SIZE -1
  

  let camY = getHeightAt(camX,camZ) +24
  let lookY = getHeightAt(lookX,lookZ)

  camera.position.set(camX, camY, camZ);
  camera.lookAt(lookX, lookY, lookZ);
  
  controls.target.set(lookX, lookY, lookZ);
  controls.update();
  updateTextBoxes(view);
}

// window.setCameraView = function(viewName) {
//   const view = views[viewName];
//   if (!view) return;

//   let camX = ( view[0]/100 - .5) * OPT_SIZE
//   let camZ = ( -view[1]/100 + .5) * OPT_SIZE
//   lookX = ( view[2]/100 - .5) * OPT_SIZE
//   lookZ = ( -view[3]/100 + .5) * OPT_SIZE -1
  

//   camera.position.set(camX, view_ht, camZ);
//   camera.lookAt(lookX, look_ht, lookZ);
  
//   controls.target.set(lookX, look_ht, lookZ);
//   controls.update();
//   updateTextBoxes(view);
// }