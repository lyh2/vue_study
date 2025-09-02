// 下面是使用ploy2tri 三角细分库的使用
if( Detector.webgl ){

	init( true );
	
}else{
	
	init( false );
} 

function init( webgl ){

	var screen = document.getElementById('screen');
	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera( 45, 900 / 600, 1, 10000 );
	camera.position.z = 1000;
	var renderer = webgl ? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
	
	renderer.setSize( 900, 600 );
	renderer.setClearColor (new THREE.Color (0xaaccff), 1);
	screen.appendChild( renderer.domElement );
	
	var b1 = document.getElementById('b1');
	var b2 = document.getElementById('b2');
	
	var vs1 = [ 
		new THREE.Vector2( -222, -50 ),
		new THREE.Vector2( -199, 88 ),
		new THREE.Vector2( -101, 188 ),
		new THREE.Vector2( 28, 131 ),
		new THREE.Vector2( 74, -16 ),
		new THREE.Vector2( 145, -70 ),
		new THREE.Vector2( 216, 42 ),
		new THREE.Vector2( 280, 14 ),
		new THREE.Vector2( 155, -141 ),
		new THREE.Vector2( 54, -90 ),
		new THREE.Vector2( -20, 54 ),
		new THREE.Vector2( -94, 91 ),
		new THREE.Vector2( -149, 35 ),
		new THREE.Vector2( -161, -44 )
	];
	
	var vs2 = [ 
		new THREE.Vector2( 0, 86 ),
		new THREE.Vector2( 42, 157 ),
		new THREE.Vector2( 43, 74 ),
		new THREE.Vector2( 115, 115 ),
		new THREE.Vector2( 74, 43 ),
		new THREE.Vector2( 157, 42 ),
		new THREE.Vector2( 86, 0 ),
		new THREE.Vector2( 157, -42 ),
		new THREE.Vector2( 74, -43 ),
		new THREE.Vector2( 115, -115 ),
		new THREE.Vector2( 43, -74 ),
		new THREE.Vector2( 42, -157 ),
		new THREE.Vector2( 0, -86 ),
		new THREE.Vector2( -42, -157 ),
		new THREE.Vector2( -43, -74 ),
		new THREE.Vector2( -115, -115 ),
		new THREE.Vector2( -74, -43 ),
		new THREE.Vector2( -157, -42 ),
		new THREE.Vector2( -86, 0 ),
		new THREE.Vector2( -157, 42 ),
		new THREE.Vector2( -74, 43 ),
		new THREE.Vector2( -115, 115 ),
		new THREE.Vector2( -43, 74 ),
		new THREE.Vector2( -42, 157 )
	];
	
	vs2Hole = [
		new THREE.Vector2( 0, 50 ),
		new THREE.Vector2( 50, 50 ),
		new THREE.Vector2( 50, 0 ),
		new THREE.Vector2( 50, -50 ),
		new THREE.Vector2( 0, -50 ),
		new THREE.Vector2( -50, -50 ),
		new THREE.Vector2( -50, 0 ),
		new THREE.Vector2( -50, 50 )
	];
	
	var m1 = new THREE.Mesh( geometryFromTris( getTris( vs1 ) ), new THREE.MeshBasicMaterial( { color: 0x990000, wireframe: true } ) );
	m1.scale.x = m1.scale.y = 1;
	
	var m2 = new THREE.Mesh( geometryFromTris( getTris( vs2, vs2Hole ) ), new THREE.MeshBasicMaterial( { color: 0x008800, wireframe: true } ) );
	m2.scale.x = m2.scale.y = 1.5;
	
	m1.position.x = - 250;
	m2.position.x = 250;
				
	scene.add( m1 );
	scene.add( m2 );
	
	function render() {
		
		m1.rotation.y += Math.PI / 300;
		m2.rotation.y += Math.PI / 300;
		
		requestAnimationFrame( render );
		renderer.render( scene, camera );
	}

	render();
}

THREE.Geometry.prototype.generateFace3 = function ( v1, v2, v3, normal ){
	
	this.vertices[ this.vertices.length ] = v1;
	this.vertices[ this.vertices.length ] = v2;
	this.vertices[ this.vertices.length ] = v3;
	
	var face = new THREE.Face3();
	
	face.a = this.vertices.length - 3;
	face.b = this.vertices.length - 2;
	face.c = this.vertices.length - 1;
	
	if( normal !== undefined ) face.normal = normal;
	
	this.faces.push( face );
};

function geometryFromTris( tris ){
	
	var geo = new THREE.Geometry();
	
	for( var i = 0 ; i < tris.length ; i++ ){
		
		var tri = tris[ i ];
		var v1, v2, v3;
					
		v1 = new THREE.Vector3( tri.points_[ 0 ].x, tri.points_[ 0 ].y, 0 );
		v2 = new THREE.Vector3( tri.points_[ 1 ].x, tri.points_[ 1 ].y, 0 );
		v3 = new THREE.Vector3( tri.points_[ 2 ].x, tri.points_[ 2 ].y, 0 );
		
		geo.vertices[ geo.vertices.length ] = v1;
		geo.vertices[ geo.vertices.length ] = v2;
		geo.vertices[ geo.vertices.length ] = v3;
		
		var face = new THREE.Face3();
		
		face.a = geo.vertices.length - 3;
		face.b = geo.vertices.length - 2;
		face.c = geo.vertices.length - 1;
		
		geo.faces.push( face );
		
		geo.mergeVertices();
	}
	return geo;
}

function getTris( vecs, hole ){
	
	/* This function can add up to one hole in the mesh - could be more. */
	
	var contour = [];
	var holeContour = [];
	
	for( var i = 0 ; i < vecs.length ; i++ ){
		
		contour.push( new poly2tri.Point( vecs[ i ].x, vecs[ i ].y ) );	
	}
	
	if( hole !== undefined ){
	
		for( var i = 0 ; i < hole.length ; i++ ){

			holeContour.push( new poly2tri.Point( hole[ i ].x, hole[ i ].y ) );	
		}
		return ( new poly2tri.SweepContext( contour ) ).addHole( holeContour ).triangulate().getTriangles();
	
	}else{
		
		return ( new poly2tri.SweepContext( contour ) ).triangulate().getTriangles();
	}
}

function normalIsFacingCamera( normal, cam ){
	
	var v = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( cam.quaternion );
	var dot = v.dot( normal );
	
	if( dot < 0 && dot >= -1 ) return true;
	
	return false;
}

function present( item, array ){
	
	for( var i = 0 ; i < array.length ; i++ ){
		
		if( item === array[ i ] ) return true;
	}
	return false;
}