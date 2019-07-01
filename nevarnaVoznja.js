// Global variable definitionvar canvas;
var canvas;
var gl;
var shaderProgram;

// Buffers
var worldVertexPositionBuffer = null;
var worldVertexTextureCoordBuffer = null;

var robnikiVertexPositionBuffer=null;
var robnikiVertexTextureCoordBuffer=null;

var steneVertexPositionBuffer = null;
var steneVertexTextureCoordBuffer = null;
// :nastavi buffer
var ovireVertexPositionBuffer = null;
var ovireVertexTextureCoordBuffer = null;

//  kovanci
var CoinVertexPositionBuffer=null;
var CoinVertexTextureCoordBuffer=null;

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// Variables for storing textures
var wallTexture;
var robnikTexture;
var steneTexture;
// :init text
var ovireTexture
var coinTexture;
// Variable that stores  loading state of textures.
var texturesLoaded = 0;

// Keyboard handling helper variable for reading the status of keys
var currentlyPressedKeys = {};

// Variables for storing current position and speed
var pitch = 0;
var pitchRate = 0;
//   : rotate the camera 
var yaw = 180;
var yawRate = 0;
var xPosition = 0;
var yPosition = 0.4;
var zPosition = 0;
//   : always moving forward
speed = 0.01;


//   : lokacija ovir
var zLokacijaOvir = [];
var x1LokacijaOvir = [];  
var x2LokacijaOvir = []; 
var ovirePozicijaZ = 5.0;


//   : lokacija kovancev
var zLokacijaKovancev = [];
var x1LokacijaKovancev = [];  
var x2LokacijaKovancev = []; 
var kovanciPozicijaZ = 18.0;


// Helper variable for animation
var lastTime = 0;

//
// Matrix utility functions
//
// mvPush   ... push current matrix on matrix stack
// mvPop    ... pop top matrix from stack
// degToRad ... convert degrees to radians
//

function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if (mvMatrixStack.length == 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}



//
// initGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initGL(canvas) {

  var gl = null;
  try {
    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    make_base();
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    
  } catch(e) {}

  // If we don't have a GL context, give up now
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
  return gl;
}
function make_base()
{
  base_image = new Image();
  base_image.src = "./assets/plosca.png";
  base_image.onload = function(){
  //gl.drawImage(base_image, 0, 0);
  }
}
//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
  var shaderScript = document.getElementById(id);

  // Didn't find an element with the specified ID; abort.
  if (!shaderScript) {
    return null;
  }
  
  // Walk through the source element's children, building the
  // shader source string.
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) {
        shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
  
  // Now figure out what type of shader script we have,
  // based on its MIME type.
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;  // Unknown shader type
  }

  // Send the source to the shader object
  gl.shaderSource(shader, shaderSource);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");
  
  // Create the shader program
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  
  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }
  
  // start using shading program for rendering
  gl.useProgram(shaderProgram);
  
  // store location of aVertexPosition variable defined in shader
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");

  // turn on vertex position attribute at specified position
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  // store location of aVertexNormal variable defined in shader
  shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");

  // store location of aTextureCoord variable defined in shader
  gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

  // store location of uPMatrix variable defined in shader - projection matrix 
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  // store location of uMVMatrix variable defined in shader - model-view matrix 
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  // store location of uSampler variable defined in shader
  shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

//
// setMatrixUniforms
//
// Set the uniforms in shaders.
//
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//
function initTextures() {
  wallTexture = gl.createTexture();
  robnikTexture = gl.createTexture();
  steneTexture = gl.createTexture();
  // 
  ovireTexture=gl.createTexture();
  coinTexture=gl.createTexture();
  wallTexture.image = new Image();
  robnikTexture.image = new Image();
  steneTexture.image = new Image();
  // 
  ovireTexture.image=new Image();
  
  coinTexture.image=new Image();
  wallTexture.image.onload = function () {
    handleTextureLoaded(wallTexture)
  }
  robnikTexture.image.onload = function () {
    handleTextureLoaded(robnikTexture);
  }
  steneTexture.image.onload = function () 
  {
    handleTextureLoaded(steneTexture);
  }
  // 
  ovireTexture.image.onload = function () 
  {
    handleTextureLoadedZaOvire(ovireTexture);
  }
  coinTexture.image.onload = function () 
  {
    handleTextureLoaded2(coinTexture);
  }
  wallTexture.image.src = "./assets/cesta.png";
  robnikTexture.image.src="./assets/bricks.png";
  steneTexture.image.src="./assets/wall.png";
  // 
  ovireTexture.image.src="./assets/bricks.png";
  coinTexture.image.src="./assets/gold.png";
  //tekstura za stene 
}

function handleTextureLoaded(texture) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Third texture usus Linear interpolation approximation with nearest Mipmap selection
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR  );
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null);

  // when texture loading is finished we can draw scene.
  texturesLoaded +=1;
}

// Kovanci
function handleTextureLoaded2(texture) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Third texture usus Linear interpolation approximation with nearest Mipmap selection
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // when texture loading is finished we can draw scene.
  texturesLoaded +=1;
}

function handleTextureLoadedZaOvire(texture) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Third texture usus Linear interpolation approximation with nearest Mipmap selection
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null);

  // when texture loading is finished we can draw scene.
  texturesLoaded +=1;
}

//
// handleLoadedWorld
//
// Initialisation of world 
// : kovanci
function handleLoadedKovanci()
{
  var numberOfSides = 100;
  var numberOfVertices=numberOfSides*3;

  var minX= -4.50,
      maxX= 4.50;
  var y = 0.30;
  var radius = 0.15;
  

  var doublePi=2.00*parseFloat(Math.PI);
  var vertexPositions=[];
  var vertexTextureCoords=[];
  var vertexCount=0;
  
  for(var k = 0; k < 50 ; k++){
    var x=Math.random()*(maxX-minX)+minX;
    
    x2LokacijaKovancev.push(x);
    //console.log("x pozicija kovanc: " + x+( radius * Math.cos( 0* doublePi / numberOfSides )));
    
    
    kovanciPozicijaZ += 18;
    zLokacijaKovancev.push(kovanciPozicijaZ);
    //console.log("kovanci z: " + kovanciPozicijaZ);
    for(var i=0;i<numberOfVertices;i++){
      
      var rob1x=x+( radius * Math.cos( i* doublePi / numberOfSides ));
      

      //console.log(rob1x)
      var rob1y=y+( radius * Math.sin( i* doublePi / numberOfSides ) );

      var rob2x=x+( radius * Math.cos( (i+1)* doublePi / numberOfSides ) );
      
      //console.log(rob2x)
      var rob2y=y+( radius * Math.sin( (i+1)* doublePi / numberOfSides ) );


  //računanje enega trikotnika v krogu
      vertexPositions.push(x);
      vertexPositions.push(y);
      vertexPositions.push(kovanciPozicijaZ);
      
      vertexTextureCoords.push(0.0);
      vertexTextureCoords.push(3.0);

      vertexPositions.push(x+( radius * Math.cos( i* doublePi / numberOfSides ) ));
      vertexPositions.push((y)+( radius * Math.sin( i* doublePi / numberOfSides ) ));
      vertexPositions.push(kovanciPozicijaZ);
      
      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(0.0);

      vertexPositions.push(x+( radius * Math.cos( (i+1)* doublePi / numberOfSides ) ) );
      vertexPositions.push((y)+( radius * Math.sin( (i+1)* doublePi / numberOfSides ) ) );
      vertexPositions.push(kovanciPozicijaZ);

      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(3.0);

      vertexCount+=3;
      //robovi za kovanec 1 trikotnik

      vertexPositions.push(parseFloat(rob1x));
      vertexPositions.push(parseFloat(rob1y));
      vertexPositions.push(kovanciPozicijaZ);

      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(0.0);

      vertexPositions.push(parseFloat(rob1x));
      vertexPositions.push(parseFloat(rob1y));
      vertexPositions.push(kovanciPozicijaZ+0.06);

      vertexTextureCoords.push(0.0);
      vertexTextureCoords.push(3.0);

      vertexPositions.push(parseFloat(rob2x));
      vertexPositions.push(parseFloat(rob2y));
      vertexPositions.push(kovanciPozicijaZ);

      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(3.0);

      vertexCount+=3;
      //drugi del roba

      vertexPositions.push(parseFloat(rob1x));
      vertexPositions.push(parseFloat(rob1y));
      vertexPositions.push(kovanciPozicijaZ+0.06);

      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(3.0);

      vertexPositions.push(parseFloat(rob2x));
      vertexPositions.push(parseFloat(rob2y));
      vertexPositions.push(kovanciPozicijaZ);

      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(3.0);

      vertexPositions.push(parseFloat(rob2x));
      vertexPositions.push(parseFloat(rob2y));
      vertexPositions.push(kovanciPozicijaZ+0.06);

      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(3.0);

      vertexCount+=3;

      //zadnja stran kovanca

      vertexPositions.push(x);
      vertexPositions.push(y);
      vertexPositions.push(kovanciPozicijaZ+0.06);
      
      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(0.0);

      vertexPositions.push(x+( radius * Math.cos( i* doublePi / numberOfSides ) ));
      vertexPositions.push((y)+( radius * Math.sin( i* doublePi / numberOfSides ) ));
      vertexPositions.push(kovanciPozicijaZ+0.06);
      
      vertexTextureCoords.push(0.0);
      vertexTextureCoords.push(3.0);

      vertexPositions.push(x+( radius * Math.cos( (i+1)* doublePi / numberOfSides ) ) );
      vertexPositions.push((y)+( radius * Math.sin( (i+1)* doublePi / numberOfSides ) ) );
      vertexPositions.push(kovanciPozicijaZ+0.06);

      vertexTextureCoords.push(3.0);
      vertexTextureCoords.push(3.0);

      vertexCount+=3;

    }
    
}
  CoinVertexPositionBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, CoinVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
  CoinVertexPositionBuffer.itemSize=3;
  CoinVertexPositionBuffer.numItems=vertexCount;

  CoinVertexTextureCoordBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, CoinVertexTextureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
  CoinVertexTextureCoordBuffer.itemSize = 2;
  CoinVertexTextureCoordBuffer.numItems = vertexCount;
}
//
// : nastavil ovire na random
//  : ovire po celi progi, po celi sirini 
function handleLoadedOvire(){
  
  var vertexCount=0;
  var vertexPositions=[];
  var vertexTextureCoords=[];
  var minX=-6.50,
      maxX=3.50;
      

  for(var i = 0; i < velikostMape/5-1 ; i++)
  { 
    var randomX = Math.random()*(maxX-minX)+minX;
    var sirina = randomX + 3.0;
    //console.log("x1: " + sirina);
    x1LokacijaOvir.push(sirina);
    //console.log("x2: "+ randomX);
    x2LokacijaOvir.push(randomX);
    
    
    //console.log("z: "+ovirePozicijaZ);
    zLokacijaOvir.push(ovirePozicijaZ);
    ovirePozicijaZ += 5.0;

    vertexPositions.push(randomX);
    vertexPositions.push(0.00);
    vertexPositions.push(ovirePozicijaZ);

    vertexTextureCoords.push(3.0);
    vertexTextureCoords.push(3.0);

    vertexPositions.push(randomX);
    vertexPositions.push(1.00);
    vertexPositions.push(ovirePozicijaZ);

    vertexTextureCoords.push(0.0);
    vertexTextureCoords.push(3.0);

    vertexPositions.push(sirina);
    vertexPositions.push(0.00);
    vertexPositions.push(ovirePozicijaZ);

    vertexTextureCoords.push(0.0);
    vertexTextureCoords.push(0.0);
    vertexCount += 3;

//2 trikotnik
    vertexPositions.push(randomX);
    vertexPositions.push(1.00);
    vertexPositions.push(ovirePozicijaZ);

    vertexTextureCoords.push(0.0);
    vertexTextureCoords.push(3.0);

    vertexPositions.push(sirina);
    vertexPositions.push(1.00);
    vertexPositions.push(ovirePozicijaZ);

    vertexTextureCoords.push(0.0);
    vertexTextureCoords.push(0.0);

    vertexPositions.push(sirina);
    vertexPositions.push(0.00);
    vertexPositions.push(ovirePozicijaZ);

    vertexTextureCoords.push(3.0);
    vertexTextureCoords.push(0.0);

    vertexCount += 3;
    
  }

  ovireVertexPositionBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ovireVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
  ovireVertexPositionBuffer.itemSize=3;
  ovireVertexPositionBuffer.numItems=vertexCount;

  ovireVertexTextureCoordBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ovireVertexTextureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
  ovireVertexTextureCoordBuffer.itemSize = 2;
  ovireVertexTextureCoordBuffer.numItems = vertexCount;
}
function handleLoadedWorld(data) {
  //nalaganje sveta iz neke datoteke
  var lines = data.split("\n");
  var vertexCount = 0;
  //st oglisc
  var vertexPositions = [];
  //hranili polozaje oglisc
  var vertexTextureCoords = [];
  //teksturne koordinate
  for (var i in lines) {
    var vals = lines[i].replace(/^\s+/, "").split(/\s+/);
    //nadomescamo blankspace s praznim nizom in splita naprej
    if (vals.length == 5 && vals[0] != "//") {
      // It is a line describing a vertex; get X, Y and Z first
      vertexPositions.push(parseFloat(vals[0]));
      vertexPositions.push(parseFloat(vals[1]));
      vertexPositions.push(parseFloat(vals[2]));

      // And then the texture coords
      vertexTextureCoords.push(parseFloat(vals[3]));
      vertexTextureCoords.push(parseFloat(vals[4]));

      vertexCount += 1;
    }
  }

  worldVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
  worldVertexPositionBuffer.itemSize = 3;
  worldVertexPositionBuffer.numItems = vertexCount;

  worldVertexTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
  worldVertexTextureCoordBuffer.itemSize = 2;
  worldVertexTextureCoordBuffer.numItems = vertexCount;

  document.getElementById("loadingtext").textContent = "";
}

function handleLoadedRobnik(data) {

  //nalaganje sveta iz neke datoteke
  var lines = data.split("\n");
  var vertexCount = 0;
  console.log(vertexCount);
  //st oglisc
  var vertexPositions = [];
  //hranili polozaje oglisc
  var vertexTextureCoords = [];
  //teksturne koordinate
  for (var i in lines) {
    var vals = lines[i].replace(/^\s+/, "").split(/\s+/);
    //nadomescamo blankspace s praznim nizom in splita naprej
    if (vals.length == 5 && vals[0] != "//") {
      // It is a line describing a vertex; get X, Y and Z first
      vertexPositions.push(parseFloat(vals[0]));
      vertexPositions.push(parseFloat(vals[1]));
      vertexPositions.push(parseFloat(vals[2]));

      // And then the texture coords
      vertexTextureCoords.push(parseFloat(vals[3]));
      vertexTextureCoords.push(parseFloat(vals[4]));

      vertexCount += 1;
    }
  }

  robnikiVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, robnikiVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
  robnikiVertexPositionBuffer.itemSize = 3;
  robnikiVertexPositionBuffer.numItems = vertexCount;
 

  robnikiVertexTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, robnikiVertexTextureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
  robnikiVertexTextureCoordBuffer.itemSize = 2;
  robnikiVertexTextureCoordBuffer.numItems = vertexCount;
  
 
 
}
function handleLoadedStene(data) {

  //nalaganje sveta iz neke datoteke
  var lines = data.split("\n");
  var vertexCount = 0;
  //st oglisc
  var vertexPositions = [];
  //hranili polozaje oglisc
  var vertexTextureCoords = [];
  //teksturne koordinate
  for (var i in lines) {
    var vals = lines[i].replace(/^\s+/, "").split(/\s+/);
    //nadomescamo blankspace s praznim nizom in splita naprej
    if (vals.length == 5 && vals[0] != "//") {
      // It is a line describing a vertex; get X, Y and Z first
      vertexPositions.push(parseFloat(vals[0]));
      vertexPositions.push(parseFloat(vals[1]));
      vertexPositions.push(parseFloat(vals[2]));

      // And then the texture coords
      vertexTextureCoords.push(parseFloat(vals[3]));
      vertexTextureCoords.push(parseFloat(vals[4]));

      vertexCount += 1;
    }
  }

  steneVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, steneVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
  steneVertexPositionBuffer.itemSize = 3;
  steneVertexPositionBuffer.numItems = vertexCount;
 

  steneVertexTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, steneVertexTextureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
  steneVertexTextureCoordBuffer.itemSize = 2;
  steneVertexTextureCoordBuffer.numItems = vertexCount;
  
 
}

//
// loadWorld
//
// Loading world 
//
function loadWorld() {
  var request = new XMLHttpRequest();
  request.open("GET", "./assets/cesta1.txt");
  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      handleLoadedWorld(request.responseText);
    }
  }
  request.send();
}

function loadRobniki() {
  var request = new XMLHttpRequest();
  request.open("GET", "./assets/robniki1.txt");
  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      
      handleLoadedRobnik(request.responseText);
      
    
    }
  }
  request.send();
}
function loadStene() {
  var request = new XMLHttpRequest();
  request.open("GET", "./assets/zunanje_stene1.txt");
 
  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      
      handleLoadedStene(request.responseText);
      
    
    }
  }
  request.send();
}

//
// drawScene
//
// Draw the scene.
//

function drawScene(clock) {
  
  // set the rendering environment to full canvas size
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // If buffers are empty we stop loading the application.
  if (worldVertexTextureCoordBuffer == null || worldVertexPositionBuffer == null) {
    return;
  }
  
  // Establish the perspective with which we want to view the
  // scene. Our field of view is 45 degrees, with a width/height
  // ratio of 640:480, and we only want to see objects between 0.1 units
  // and 950 units away from the camera.
  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 950.0, pMatrix);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  mat4.identity(mvMatrix);

  // Now move the drawing position a bit to where we want to start
  // drawing the world.
  mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
  mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
  mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);

  // Activate textures
  road();
 
  side();
 
  wals();
  // 
  ovire();
  coin();
}
// 
function coin()
{
 
  gl.activeTexture(gl.TEXTURE0+4);
  
  gl.bindTexture(gl.TEXTURE_2D, coinTexture);
  gl.uniform1i(shaderProgram.samplerUniform, 4);
 
  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, CoinVertexTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, CoinVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the world by binding the array buffer to the world's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, CoinVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, CoinVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the cube.
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, CoinVertexPositionBuffer.numItems);
}
function ovire()
{
 
  gl.activeTexture(gl.TEXTURE0+3);
  
  gl.bindTexture(gl.TEXTURE_2D, ovireTexture);
  gl.uniform1i(shaderProgram.samplerUniform, 3);
 
  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, ovireVertexTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, ovireVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the world by binding the array buffer to the world's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, ovireVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, ovireVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the cube.
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, ovireVertexPositionBuffer.numItems);
}
function road()
{
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, wallTexture);
  gl.uniform1i(shaderProgram.samplerUniform, 0);

  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the world by binding the array buffer to the world's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the cube.
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);
}
function side()
{
 
  gl.activeTexture(gl.TEXTURE0+1);
  
  gl.bindTexture(gl.TEXTURE_2D, robnikTexture);
  gl.uniform1i(shaderProgram.samplerUniform, 1);
 
  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, robnikiVertexTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, robnikiVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the world by binding the array buffer to the world's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, robnikiVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, robnikiVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the cube.
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, robnikiVertexPositionBuffer.numItems);
}
function wals()
{
  gl.activeTexture(gl.TEXTURE0+2);
  
  gl.bindTexture(gl.TEXTURE_2D, steneTexture);
  gl.uniform1i(shaderProgram.samplerUniform, 2);
 
  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, steneVertexTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, steneVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the world by binding the array buffer to the world's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, steneVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, steneVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the cube.
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, steneVertexPositionBuffer.numItems); 
}

//
// animate
//
// Called every time before redeawing the screen.
//
// look up the elements we want to affect


function animate() {
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
    var elapsed = timeNow - lastTime;
     
    if (speed != 0) {
      if(yaw != 180){
        xPosition -= Math.sin(degToRad(yaw)) * speed * elapsed;
      }
      //console.log(yaw + " speed: " + speed + " elapsed: " + elapsed);
      //console.log("x: " + xPosition + " de "+ Math.sin(degToRad(yaw)));
      zPosition -= Math.cos(degToRad(yaw)) * speed * elapsed;
      
      //joggingAngle += elapsed * 0.6; // 0.6 "fiddle factor" - makes it feel more realistic :-)
      //yPosition = Math.sin(degToRad(joggingAngle)) / 20 + 0.4
    }

    yaw += yawRate * elapsed;
    pitch += pitchRate * elapsed;
    // console.log("zPosition: " + zPosition);
  

  }
  lastTime = timeNow;
}

//
// Keyboard handling helper functions
//
// handleKeyDown    ... called on keyDown event
// handleKeyUp      ... called on keyUp event
//
function handleKeyDown(event) {
  // storing the pressed state for individual key
  currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
  // reseting the pressed state for individual key
  currentlyPressedKeys[event.keyCode] = false;
}

//
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
var velikostMape = 900;
var speedUpLokacija = velikostMape * 0.2;
var konecIzpisa = speedUpLokacija;
function handleKeys() {
   
  if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
    // Left cursor key or A
    yawRate = 0.07;
  } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
    // Right cursor key or D
    yawRate = -0.07;
  }
   else {
    yawRate = 0;
  }
  
  //   : stays on track
  if(xPosition > 4.9){
    xPosition = 4.87;  
  }
  if(xPosition < -4.9){
    xPosition = -4.8;  
  }
  //  : speeding up after 20% of track
  if(zPosition > speedUpLokacija){
    speed *= 1.2;
    konecIzpisa = speedUpLokacija;
    speedUpLokacija += speedUpLokacija;
    document.getElementById("speed").innerHTML = "SPEEDING UP FOR 20%";
  }

  if(zPosition > konecIzpisa + 25){
    document.getElementById("speed").innerHTML = "";
  }

   if(zPosition > velikostMape){
      document.getElementById("youWon").innerHTML = "YOU WON";
      zPosition = velikostMape - 0.02;
      setInterval(function(){document.location.reload()}, 2000); // Game over: loads the document again
   }

   //  : slowDown
  if(stKovancev == 6){
    speed *=  0.9;
    stKovancev -= 5 ;
  }

  //   : timer
  time = setInterval(time+1,1000);
  
  document.getElementById("time").innerHTML = time/100; 


  // //  : collision ovire
   for(var i = 0; i < zLokacijaOvir.length; i++){     
     var zPolozaj = zLokacijaOvir[i] - zPosition;
     if(zPolozaj != 0 && zPolozaj < -5 && zPolozaj > -5.5 && xPosition <= x1LokacijaOvir[i] && xPosition >= x2LokacijaOvir[i] && lastTime2 == 0){
       //alert("BAM" +" x0: "+ xPosition + " | x1: " +  x1LokacijaOvir[i] +" | x2: " + x2LokacijaOvir[i] + " | z: " + zPolozaj);
       lastTime2 = time/100;
       stKovancev--;
       if(stKovancev == 0){
         alert("Game Over!");
          document.location.reload(); // Game over: loads the document again
          clearInterval(interval); // Needed for Chrome to end game
       }
     }

     if(time/100 - lastTime2 > 0.2){
       lastTime2 = 0;
     }
   }

   document.getElementById("coins").innerHTML = stKovancev; 
//console.log("xPosition: "+ xPosition + " zPosition: " + zPosition);
   //  : collision kovanci
   for(var i = 0; i < zLokacijaKovancev.length; i++){
    var zPolozaj = zLokacijaKovancev[i] - zPosition; 
    //console.log("BAM2 kovanc" +" x0: "+ xPosition + " | x1: " +  x1LokacijaKovancev[i] +" | x2: " + x2LokacijaKovancev[i] + " | z: " + zPolozaj);
    if(zPolozaj > -0.05 && zPolozaj < 0.09 && xPosition <= x2LokacijaKovancev[i] + 0.4 && xPosition >= x2LokacijaKovancev[i] - 0.4 && lastTime3 == 0){
      //alert("BAM2 kovanc" +" x0: "+ xPosition + " | x1: " +  x2LokacijaKovancev[i] +" | x2: " + (x2LokacijaKovancev[i]-0.4) + " | z: " + zPolozaj);
      lastTime3 = time/100;
      stKovancev++;
    }
    if(time/100 - lastTime3 > 0.2){
      lastTime3 = 0;
    }
    
   }
 
  
}
//    = time
var lastTime2 = 0;
var lastTime3 = 0;
var stKovancev = 1;


function start() {
  var audio = new Audio("./assets/carStart.mp3");
  audio.play();
  
  canvas = document.getElementById("glcanvas");
  gl = initGL(canvas);      // Initialize the GL context

  // Only continue if WebGL is available and working
  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
    gl.clearDepth(1.0);                                     // Clear everything
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
   
    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();
    
    // Next, load and set up the textures we'll be using.
    initTextures();

    // Initialise world objects

    loadWorld();
    loadRobniki();
    loadStene();
    handleLoadedOvire();
    handleLoadedKovanci();
    // Bind keyboard handling functions to document handlers
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    
    
    // Set up to draw the scene periodically.
    setInterval(function() {
      if (texturesLoaded>0) { // only draw scene and animate when textures are loaded.
        requestAnimationFrame(animate);
        handleKeys();
        drawScene();
      }
    }, 10);
  }
}