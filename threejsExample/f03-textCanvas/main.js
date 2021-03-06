if (WEBGL.isWebGL2Available() === false) {
  document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
}

let res = loadLocalRes([
  'first.vert',
  'first.frag'
], main);
function main() {
  init();
  animate();
  // render();
}
var container;
var camera, scene, renderer;
let mesh;
let ctx;
function init() {
  let text = document.querySelector(".text");
  ctx = text.getContext("2d");
  ctx.canvas.width=text.clientWidth;
  ctx.canvas.height=text.clientHeight;

  container = document.getElementById('container');
  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 5;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  // geometry


  var geometry = new THREE.BufferGeometry();

  var positionAttribute = new THREE.Float32BufferAttribute(f.positions, 3);
  var uvAttribute = new THREE.Float32BufferAttribute(f.uv, 2);

  geometry.addAttribute('position', positionAttribute);
  geometry.addAttribute('uv', uvAttribute);
  geometry.scale(0.01, 0.01, 0.01);

  var image = document.createElement('img');
  image.width = 256;
  image.height = 128;
  image.src = '/assets/img/boxTex.svg';
  image.onload = function (img) {
    texture.needsUpdate = true;
  }
  var texture = new THREE.Texture(image);

  // var loader = new THREE.TextureLoader();
  // var texture = loader.load('/assets/img/boxTex.svg');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;


  // material
  var material = new THREE.RawShaderMaterial({
    uniforms: {
      texture1: { value: texture }
    },
    vertexShader: res["first.vert"],
    fragmentShader: res["first.frag"],
    side: THREE.DoubleSide,
    // transparent: true

  });

   mesh = new THREE.Mesh(geometry, material);
  // mesh.scale.set(0.01,0.01,0.01);

  scene.add(mesh);

  var canvas = document.querySelector(".scene")
  var context = canvas.getContext('webgl2');
  renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  // renderer.setClearColor( 0xffffff, 0);
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);
  var controls = new THREE.OrbitControls(camera, renderer.domElement);


}

function toScreen(vector) {
  vector.x = (vector.x + 1) * container.clientWidth / 2;
  vector.y = - (vector.y - 1) * container.clientHeight / 2;
  vector.z = 0;
  return vector;
}
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
//

function animate() {
  requestAnimationFrame(animate);
 //animate F
mesh.rotation.y+=0.05;
//display text
mesh.updateMatrixWorld();
  let point = new THREE.Vector3(1, 0, 0);
  point.applyMatrix4(mesh.matrixWorld); 
  point.project(camera);
  point = toScreen(point);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.beginPath();
  ctx.moveTo(10, 5);
  ctx.lineTo(0, 0);
  ctx.lineTo(5, 10);
  ctx.moveTo(0, 0);
  ctx.lineTo(15, 15);
  ctx.stroke();
  ctx.fillText("" + point.x.toFixed(2) + "," + point.y.toFixed(2), 20, 20);
  ctx.restore();


  render();
}
function render() {
  renderer.render(scene, camera);
}