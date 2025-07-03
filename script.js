const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const minimapRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('minimap'), antialias: true });
    minimapRenderer.setSize(150, 150);

    const minimapCamera = new THREE.OrthographicCamera(-40, 40, 40, -40, 1, 1000);
    minimapCamera.position.set(0, 80, 0);
    minimapCamera.lookAt(0, 0, 0);

    // Lighting
    const pointLight = new THREE.PointLight(0xffffff, 2, 1000);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x333333); // Adds general illumination
    scene.add(ambientLight);

    // Sun
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFDB813 });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 32), sunMaterial);
    scene.add(sun);

    // Star field
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
    const starVertices = [];
    for (let i = 0; i < 2000; i++) {
      starVertices.push((Math.random() - 0.5) * 2000);
      starVertices.push((Math.random() - 0.5) * 2000);
      starVertices.push((Math.random() - 0.5) * 2000);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Planet data
    const planetData = [
      { name: "Mercury", color: 0xaaaaaa, radius: 1.0, orbitRadius: 8, orbitSpeed: 1.6 },
      { name: "Venus", color: 0xffaa00, radius: 1.4, orbitRadius: 11, orbitSpeed: 1.2 },
      { name: "Earth", color: 0x0077ff, radius: 1.6, orbitRadius: 15, orbitSpeed: 1 },
      { name: "Mars", color: 0xff3300, radius: 1.2, orbitRadius: 18, orbitSpeed: 0.8 },
      { name: "Jupiter", color: 0xffcc66, radius: 3.0, orbitRadius: 23, orbitSpeed: 0.4 },
      { name: "Saturn", color: 0xffdd99, radius: 2.6, orbitRadius: 28, orbitSpeed: 0.3, ring: true },
      { name: "Uranus", color: 0x66ccff, radius: 2.2, orbitRadius: 32, orbitSpeed: 0.2 },
      { name: "Neptune", color: 0x3333ff, radius: 2.2, orbitRadius: 37, orbitSpeed: 0.1 }
    ];

    const planets = [];
    const controlsDiv = document.getElementById("controls");
    const tooltip = document.getElementById("tooltip");
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    planetData.forEach(data => {
      const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
      const material = new THREE.MeshPhongMaterial({ color: data.color }); // Fixed here
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.name = data.name;
      scene.add(mesh);

      const orbitGeometry = new THREE.RingGeometry(data.orbitRadius - 0.01, data.orbitRadius + 0.01, 64);
      const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);

      if (data.ring) {
        const ringGeometry = new THREE.RingGeometry(data.radius + 0.5, data.radius + 1, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xbbbbbb, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 4;
        mesh.add(ring);
      }

      const orbitPoints = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(
          Math.cos(theta) * data.orbitRadius,
          0,
          Math.sin(theta) * data.orbitRadius
        ));
      }
      const orbitTrailGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitTrailMaterial = new THREE.LineBasicMaterial({ color: 0x888888, opacity: 0.4, transparent: true });
      const orbitTrail = new THREE.LineLoop(orbitTrailGeometry, orbitTrailMaterial);
      scene.add(orbitTrail);

      planets.push({ name: data.name, mesh, orbitRadius: data.orbitRadius, orbitSpeed: data.orbitSpeed, angle: Math.random() * Math.PI * 2 });

      const group = document.createElement("div");
      group.className = "control-group";

      const label = document.createElement("label");
      label.innerText = `${data.name} Speed`;

      const input = document.createElement("input");
      input.type = "range";
      input.min = 0.01;
      input.max = 3;
      input.step = 0.01;
      input.value = data.orbitSpeed;
      input.addEventListener("input", (e) => {
        const planet = planets.find(p => p.name === data.name);
        planet.orbitSpeed = parseFloat(e.target.value);
      });

      group.appendChild(label);
      group.appendChild(input);
      controlsDiv.appendChild(group);
    });

    const pauseBtn = document.createElement("button");
    pauseBtn.innerText = "Pause";
    pauseBtn.id = "pauseBtn";
    controlsDiv.appendChild(pauseBtn);
    let isPaused = false;
    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      pauseBtn.innerText = isPaused ? 'Resume' : 'Pause';
    });

    camera.position.z = 70;
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (!isPaused) {
        planets.forEach(p => {
          p.angle += delta * p.orbitSpeed;
          p.mesh.position.x = Math.cos(p.angle) * p.orbitRadius;
          p.mesh.position.z = Math.sin(p.angle) * p.orbitRadius;
          p.mesh.rotation.y += 0.01;
        });
      }

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
      if (intersects.length > 0) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        tooltip.innerText = intersects[0].object.userData.name;
      } else {
        tooltip.style.display = 'none';
      }

      renderer.render(scene, camera);
      minimapRenderer.render(scene, minimapCamera);
    }

    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', event => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });