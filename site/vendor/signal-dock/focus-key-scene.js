/**
 * The Remote — original “Signal Dock” decorative sculpture.
 * Three.js r186. No runtime import, external assets, listeners, or animation loop.
 * Original asset source: MIT; brand mark remains the owner's brand asset.
 */
export function createFocusKeyScene(THREE, { variant = 'key', tv = true, arcs = false } = {}) {
  const root = new THREE.Group();
  root.name = 'The Remote · Signal Dock';
  const geometries = new Set(), materials = new Set();
  const ownGeometry = g => (geometries.add(g), g);
  const ownMaterial = m => (materials.add(m), m);
  const standard = (color, roughness = .5, metalness = .18) => ownMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  const graphite = standard('#242A33', .47, .30);
  const edge = standard('#12161D', .40, .32);
  const lime = standard('#D5FF75', .50, .04);
  const ink = standard('#0D0F12', .82, .02);
  const shell = standard('#242A33', .47, .30);
  const mesh = (geometry, material, parent = root) => {
    const m = new THREE.Mesh(ownGeometry(geometry), material); parent.add(m); return m;
  };
  // Lathed profiles avoid imported models and provide an actual soft bevel.
  const lathe = (profile, segments = 96) => {
    const g = new THREE.LatheGeometry(profile.map(([r,z]) => new THREE.Vector2(r,z)), segments);
    g.rotateX(Math.PI / 2); return g;
  };
  const merge = list => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position','normal','uv','color']) {
      const arrays = list.map(g => (g.index ? g.toNonIndexed() : g).getAttribute(name));
      if (arrays.some(a => !a)) continue;
      const buffer = new Float32Array(arrays.reduce((n,a) => n+a.array.length,0));
      let offset=0; for (const a of arrays) { buffer.set(a.array,offset); offset+=a.array.length; }
      out.setAttribute(name,new THREE.BufferAttribute(buffer,arrays[0].itemSize));
    }
    for (const g of list) g.dispose();
    return out;
  };
  const roundedRect = (w,h,r) => {
    const s = new THREE.Shape(), x=-w/2, y=-h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s;
  };
  const key = new THREE.Group(); key.name = 'focus-key'; root.add(key);
  // Canonical outer radius 31; centre 11; dot 3. Scale is exactly .045.
  mesh(lathe([[0,-.14],[1.29,-.14],[1.36,-.12],[1.392,-.07],[1.395,.075],[1.383,.125],[1.35,.16],[1.29,.175],[1.14,.193],[.76,.207],[0,.212]]),graphite,key).name='satin-body';
  const seat=mesh(new THREE.RingGeometry(.492,.531,64),ink,key);seat.position.z=.213;seat.name='recessed-centre-seat';
  mesh(lathe([[0,.178],[.456,.178],[.485,.186],[.495,.201],[.494,.225],[.48,.244],[.455,.25],[0,.25]],64),lime,key).name='lime-centre';
  const dot=mesh(new THREE.CircleGeometry(3*.045,48),ink,key); dot.position.z=.2508; dot.name='centre-dot';
  const glyphPoints = [
    [[28,12],[32,8],[36,12],[34,14],[32,12],[30,14]],
    [[28,52],[32,56],[36,52],[34,50],[32,52],[30,50]],
    [[12,32],[8,36],[12,40],[14,38],[12,36],[14,34]],
    [[52,32],[56,36],[52,40],[50,38],[52,36],[50,34]]
  ];
  const glyphs = glyphPoints.map(points => {
    const shape = new THREE.Shape(points.map(([x,y])=>new THREE.Vector2((x-32)*.045,(32-y)*.045)));
    shape.closePath(); return new THREE.ShapeGeometry(shape);
  });
  const arrows=mesh(merge(glyphs),ink,key); arrows.position.z=.207; arrows.name='canonical-arrow-inlays';
  key.position.set(1.72,-.89,.75); key.rotation.set(-.26,-.32,-.13);

  const television=new THREE.Group(); television.name='illustrative-tv'; root.add(television); television.visible=tv;
  television.position.set(-.22,.65,-.55); television.rotation.set(0,-.115,.018);
  const frame=mesh(new THREE.ExtrudeGeometry(roundedRect(5.05,2.93,.105),{depth:.13,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.032,bevelThickness:.028,curveSegments:5}),shell,television);
  frame.name='matte-tv-frame';
  // A very quiet light falloff, not an app screen or entertainment screenshot.
  const screenGeometry = new THREE.ShapeGeometry(roundedRect(4.88,2.755,.07),16);
  const screen=mesh(screenGeometry,standard('#151B22',.66,.12),television); screen.position.z=.162; screen.name='abstract-unlit-screen';
  const feet = [];
  for (const x of [-1.75,1.75]) {
    const g=new THREE.BoxGeometry(.115,.50,.16);
    g.rotateZ(x<0?-.44:.44); g.translate(x,-1.60,.03); feet.push(g);
  }
  mesh(merge(feet),edge,television).name='quiet-tv-feet';

  const signals=new THREE.Group(); signals.name='connection-arcs'; root.add(signals); signals.visible=arcs&&tv;
  const arcParts=[];
  for (const [r,a,b] of [[.59,.36,1.27],[.85,.41,1.24]]) {
    const pts=[]; for(let i=0;i<=24;i++){const t=a+(b-a)*i/24;pts.push(new THREE.Vector3(Math.cos(t)*r,Math.sin(t)*r,0));}
    const path=new THREE.CatmullRomCurve3(pts);
    arcParts.push(new THREE.TubeGeometry(path,24,.014,5,false));
  }
  mesh(merge(arcParts),ownMaterial(new THREE.MeshBasicMaterial({color:'#D5FF75',transparent:true,opacity:.62})),signals);
  signals.position.set(.57,-.12,.32); signals.rotation.z=.13;

  // Analytic vertex-alpha ellipse. Texture-free and no shadow-map passes.
  const shadow = (cx,cy,rx,ry,alpha) => {
    const p=[], c=[], idx=[], seg=64;
    const stops=[[0,alpha],[.25,alpha*.90],[.50,alpha*.53],[.76,alpha*.16],[1,0]];
    for(const [r,a] of stops) for(let i=0;i<=seg;i++) {
      const t=2*Math.PI*i/seg; p.push(cx+Math.cos(t)*rx*r,cy+Math.sin(t)*ry*r,-.65); c.push(0.013,0.018,0.024,a);
    }
    for(let j=0;j<stops.length-1;j++) for(let i=0;i<seg;i++) {const a=j*(seg+1)+i,b=a+seg+1;idx.push(a,b,a+1,b,b+1,a+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,4));g.setIndex(idx);return g;
  };
  const shadowMaterial=ownMaterial(new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true}));
  const contact=mesh(merge([shadow(1.59,-2.10,1.9,.36,.50),...(tv?[shadow(-.22,-1.17,2.62,.26,.22)]:[])]),shadowMaterial); contact.name='soft-contact-shadow';
  // This shadow is an illustration in scene space, not a simulated physical floor.
  contact.renderOrder=-1;
  const lights=new THREE.Group();lights.name='studio-lighting';root.add(lights);
  lights.add(new THREE.HemisphereLight('#F6F7FB','#11171F',.72));
  const light=(color,power,position)=>{const l=new THREE.DirectionalLight(color,power);l.position.set(...position);lights.add(l);};
  light('#F6F7FB',1.9,[-4,6,7]);
  const softbox=new THREE.PointLight('#F6F7FB',28,0,2);softbox.position.set(-2.6,3.4,3.8);lights.add(softbox);
  light('#B5CBDD',3.2,[4,2,-1]);
  light('#D5FF75',.24,[-3,-1,4]);
  const framing={
    desktop:{position:[0,1.15,12],target:[0,-.13,0],span:6.55},
    mobile:{position:[0,.65,12],target:[.18,-.13,0],span:6.2},
    key:{position:[0,.5,10],target:[0,0,0],span:3.95}
  };
  const selected=variant in framing?variant:'desktop';
  if(selected==='key') {key.position.set(0,0,0);television.visible=false;signals.visible=false;contact.visible=false;key.rotation.set(-.29,-.32,-.13);}
  if(selected==='mobile'){key.scale.setScalar(.82);key.position.set(1.15,-1.12,.75);television.scale.setScalar(.86);television.position.set(-.11,.56,-.55);signals.position.set(.29,-.13,.32);contact.scale.set(.82,.82,1);contact.position.set(-.14,-.22,0);}
  const camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,50);
  const configureCamera=(width,height,mode=selected)=>{
    const f=framing[mode]||framing.desktop,aspect=Math.max(width,1)/Math.max(height,1);
    // span denotes horizontal world units; increase vertical extent for portrait boxes.
    camera.left=-f.span/2;camera.right=f.span/2;camera.top=f.span/aspect/2;camera.bottom=-f.span/aspect/2;
    camera.position.set(...f.position);camera.lookAt(...f.target);camera.updateProjectionMatrix();
  };
  configureCamera(1200,900);
  let disposed=false;
  return {root,key,television,signals,contact,lights,camera,configureCamera,
    recommendedRenderer:{alpha:true,antialias:true,powerPreference:'low-power'},
    dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();}
  };
}
