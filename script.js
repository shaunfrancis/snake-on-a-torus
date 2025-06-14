class Level{
    constructor(w,h,els,interfaces){
        this.els = els;
        this.interfaces = interfaces;

        this.gameHasBegun = false;

        this.score = 0;

        this.appleSound = new Audio("assets/audio/apple.mp3");
        this.appleSound.volume = 0.2;
        this.dieSound = new Audio("assets/audio/die.mp3");
        this.dieSound.volume = 0.2;

        let bypassSafariMediaRestrictions = () => {
            console.log(this.dieSound.duration);
            this.appleSound.currentTime = this.appleSound.duration - 0.01;
            this.appleSound.play();
            this.dieSound.currentTime = this.dieSound.duration - 0.01;
            this.dieSound.play();
            window.removeEventListener('touchend', bypassSafariMediaRestrictions);
            setTimeout( () => {
                this.appleSound.volume = 0.2;
                this.dieSound.volume = 0.2;
            }, 1000);
        };
        window.addEventListener('touchend', bypassSafariMediaRestrictions);

        this.scene = new THREE.Scene();
        this.scene.background = (new THREE.TextureLoader).load("assets/lowres.png", (texture) => {
            texture.repeat.set(-0.25,-0.25);
            texture.offset.set(0.5,0.5);
        });
    
        this.camera = new THREE.PerspectiveCamera( 70, w / h, 1, 75 );

        this.camera.position.set(...new THREE.Vector3(0.5,0,-1).normalize().multiplyScalar(18).toArray());
        this.camera.lookAt(0,0,0);
        this.camera.up = new THREE.Vector3(0,1,0);

        //let ambient = new THREE.AmbientLight(0xffffff, 0.3);
        let ambient = new THREE.AmbientLight(0xffffff, 0);
        this.ambience = ambient;
        this.addObject(ambient);
        
        this.renderer = new THREE.WebGLRenderer( {antialias: true} );
        this.renderer.setSize( w, h );
        document.getElementById('game-area').appendChild( this.renderer.domElement );

        let background = new THREE.Mesh(
            new THREE.SphereGeometry(50,10,10),
            new THREE.MeshLambertMaterial({
                map: (new THREE.TextureLoader).load("assets/background.jpg"),
                side: THREE.BackSide
            })
        );
        this.background = background;
        this.addObject(background);

        let quality = localStorage.getItem('snake_quality');
        if(quality === null) quality = "1";
        this.setQuality(quality);

        this.swipeDirection = parseInt(localStorage.getItem('snake_swipe_direction'));
        if(!this.swipeDirection){
            this.swipeDirection = 1;
            localStorage.setItem('snake_swipe_direction', '1');
        }

        this.soundEffects = localStorage.getItem('snake_sound_effects');
        if(this.soundEffects === null) this.setSoundEffects(1);
        else this.setSoundEffects(parseInt(this.soundEffects));

        this.els.pauseButton.addEventListener('click', () => {
            if(this.paused) this.unpause();
            else this.pause();
        });
        this.els.soundButton.addEventListener('click', () => {
            this.setSoundEffects( (1 + this.soundEffects) % 2);
        });
        this.els.qualityButton.addEventListener('click', () => {
            const nextQuality = window.devicePixelRatio <= 1 ? (parseInt(this.quality) + 1) % 3 : (parseInt(this.quality) + 1) % 4;
            this.setQuality(nextQuality);
        });

        this.apples = [];

        this.listeners = {};

    }

    reset(){
        this.gameHasBegun = false;
        this.score = 0;

        this.apples.forEach( apple => {
            destroyMesh(apple.mesh, this.scene);
        })
        this.apples = [];

        this.snake.removeAll(this.scene);
        let snake = new Snake(0, 13, 3, this.surfaceDimensions, this.scene);
        snake.addToScene(this.scene);
        this.snake = snake;

        this.els.score.innerHTML = "000000"

        this.interval = 250;
    }

    setQuality(n){
        n = n.toString();
        this.quality = parseInt(n);
        switch(n){
            case "3":
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.scene.add(this.background);
                this.els.qualityButton.style.backgroundImage = "url(assets/icons/max.svg)";
                break;
            case "2":
                this.renderer.setPixelRatio(1);
                this.scene.add(this.background);
                this.els.qualityButton.style.backgroundImage = "url(assets/icons/high.svg)";
                break;
            case "1":
                this.renderer.setPixelRatio(0.5);
                this.scene.add(this.background);
                this.els.qualityButton.style.backgroundImage = "url(assets/icons/med.svg)";
                break;
            case "0":
                this.renderer.setPixelRatio(0.5);
                this.scene.remove(this.background);
                this.els.qualityButton.style.backgroundImage = "url(assets/icons/low.svg)";
                break;
        }
        localStorage.setItem('snake_quality', n);

        if(this.paused) this.render(); //reflect quality change even if paused
    }

    setSwipeDirection(d){
        d = d.toString();
        localStorage.setItem('snake_swipe_direction', d);
        this.swipeDirection = parseInt(d);
    }

    setSoundEffects(b){
        b = parseInt(b);
        localStorage.setItem('snake_sound_effects', b);
        this.soundEffects = b;

        if(b == 1) this.els.soundButton.style.backgroundImage = "url(assets/icons/sound.svg)";
        else this.els.soundButton.style.backgroundImage = "url(assets/icons/mute.svg)";
    }

    addObject(mesh){
        this.scene.add(mesh);
    }

    getCameraTween(normal, up, view, distance, camera, cameraData){
        cameraData.up.initial = camera.up.clone();
        cameraData.up.delta = up.clone().sub(cameraData.up.initial);
        cameraData.up.final = cameraData.up.initial.clone().add(cameraData.up.delta);
        
        cameraData.lookAt.initial = cameraData.lookAt.final.clone();
        cameraData.lookAt.delta = view.clone().sub(cameraData.lookAt.initial);
        cameraData.lookAt.final = cameraData.lookAt.initial.clone().add(cameraData.lookAt.delta);

        const distancePosition = new THREE.Vector3(normal.x, normal.y, normal.z).multiplyScalar(distance);
        cameraData.position.initial = camera.position.clone();
        cameraData.position.delta = view.clone().add( distancePosition ).sub(cameraData.position.initial);
        cameraData.position.final = cameraData.position.initial.clone().add(cameraData.position.delta);

        return cameraData;
    }

    allowUserControl(){
        window.addEventListener('keydown', this.listeners.arrowKeys = evt => this.handleArrowKeys(evt) );

        window.addEventListener('touchstart', this.listeners.touchStart = evt => {
            if(evt.touches && evt.touches[0]){
                const startX = evt.touches[0].screenX,
                startY = evt.touches[0].screenY;

                let endX = startX, endY = startY;
                window.addEventListener('touchmove', this.listeners.touchMove = evt => {
                    if(evt.touches && evt.touches[0]){
                        endX = evt.touches[0].screenX;
                        endY = evt.touches[0].screenY;
                    }
                });

                window.addEventListener('touchend', this.listeners.touchEnd = evt => {
                    const dx = endX - startX, dy = endY - startY;
                    this.handleSwipes(dx,dy);    
                    (removeTouchListeners.bind(this))();
                });

                window.addEventListener('touchcancel', this.listeners.touchCancel = () => {
                    (removeTouchListeners.bind(this))();
                });

                function removeTouchListeners(){
                    window.removeEventListener('touchmove', this.listeners.touchMove);
                    window.removeEventListener('touchend', this.listeners.touchEnd);
                    window.removeEventListener('touchcancel', this.listeners.touchCancel);
                }
            }
        })
    }

    surrenderUserControl(){
        window.removeEventListener('keydown', this.listeners.arrowKeys);
        window.removeEventListener('touchstart', this.listeners.touchStart);
        window.removeEventListener('touchmove', this.listeners.touchMove);
        window.removeEventListener('touchend', this.listeners.touchEnd);
        window.removeEventListener('touchcancel', this.listeners.touchCancel);
    }

    handleArrowKeys(event){
        let key = event.keyCode;
        let shouldUpdate = true;

        if(key == 37 && this.snake.velocity.y == 0) this.snake.velocity = {x:0,y:1};
        else if(key == 38 && this.snake.velocity.x == 0) this.snake.velocity = {x:1,y:0};
        else if(key == 39 && this.snake.velocity.y == 0) this.snake.velocity = {x:0,y:-1};
        else if(key == 40 && this.snake.velocity.x ==0) this.snake.velocity = {x:-1,y:0};
        else shouldUpdate = false;

        if(shouldUpdate){
            this.snake.move();
            this.cameraData = this.getCameraTween(this.snake.head.normal, this.snake.head.direction, this.snake.head.upperMidpoint, 10, this.camera, this.cameraData);
        }
    }

    handleSwipes(dx,dy){
        const tolerance = 40;
        let shouldUpdate = true;

        if(Math.abs(dx) > Math.abs(dy) && this.snake.velocity.y == 0){ //x swipe
            if(dx < -tolerance) this.snake.velocity = {x:0, y:this.swipeDirection*1};
            else if(dx > tolerance) this.snake.velocity = {x:0, y:-this.swipeDirection*1};
            else shouldUpdate = false;
        }
        else if(Math.abs(dx) <= Math.abs(dy) && this.snake.velocity.x == 0){ //y swipe
            if(dy < -tolerance) this.snake.velocity = {x:this.swipeDirection*1, y:0};
            else if(dy > tolerance) this.snake.velocity = {x:-this.swipeDirection*1, y:0};
            else shouldUpdate = false;
        }
        else shouldUpdate = false;

        if(shouldUpdate){
            this.snake.move();
            this.cameraData = this.getCameraTween(this.snake.head.normal, this.snake.head.direction, this.snake.head.upperMidpoint, 10, this.camera, this.cameraData);
        }
    }

    startGame(){
        document.getElementById('container').addEventListener('touchmove', banScrolling);
        document.getElementById('container').scrollTop = 0;

        this.interfaces.mainMenu.container.classList.remove('visible');
        this.interfaces.header.container.classList.add('visible');
        this.interfaces.footer.container.classList.remove('visible');

        //this.allowUserControl();

        let futurePositionVectors = this.snake.getFuturePositionVectors(1500);
        let startGameCameraTween = this.getCameraTween(futurePositionVectors.normal, futurePositionVectors.direction, futurePositionVectors.upperMidpoint, 10, this.camera, {lookAt: {final: new THREE.Vector3(0,0,0)}, position: {final: new THREE.Vector3(0.5,0,-1).normalize().multiplyScalar(18)}, up: {} });
        
        this.animate( ((percentage) => {
            this.spotlight.intensity = 0.4 + 0.1*percentage;
            this.ambience.intensity = 0.3*percentage;
            this.camera.position.set( ...startGameCameraTween.position.initial.clone().add(startGameCameraTween.position.delta.clone().multiplyScalar(percentage)).toArray() );
            this.camera.lookAt( startGameCameraTween.lookAt.initial.clone().add(startGameCameraTween.lookAt.delta.clone().multiplyScalar(percentage)) );
            this.spotlight.position.set( ...startGameCameraTween.position.initial.clone().add(startGameCameraTween.position.delta.clone().multiplyScalar(percentage)).toArray() );
            this.camera.up = startGameCameraTween.up.initial.clone().add(startGameCameraTween.up.delta.clone().multiplyScalar(percentage));
            
        }).bind(this), Date.now(), 1500).then( () => {
            this.allowUserControl();
            this.gameHasBegun = true;
            this.gameStartTime = Date.now();
            this.path = "";
        } );

    }

    playAnimation(){
        this.snake.start = Date.now();
        this.cameraData = {lookAt: {final: new THREE.Vector3(0,0,-1)}, position: {final: new THREE.Vector3(0,0,0)}, up: {} };

        this.interval = 250;
        this.render();
    }

    render(){
        const now = Date.now();
        
        this.checkCollisions();
        this.updateApples(this.gameHasBegun);

        if(this.snake.alive){
            this.snake.nextMoveTimer = (now - this.snake.start);

            if(this.gameHasBegun){
                if(Object.keys(this.cameraData.lookAt).length > 2){
                    let percentage = Math.min( this.snake.nextMoveTimer / this.interval, 1 );
                    this.tweenCamera(percentage);
                }
            }

            if(this.snake.nextMoveTimer >= this.interval){
                this.snake.move();
                this.cameraData = this.getCameraTween(this.snake.head.normal, this.snake.head.direction, this.snake.head.upperMidpoint, 10, this.camera, this.cameraData);   
            }

        }
        else{
            let percentage = Math.min((now - this.timer) / this.interval,1);
            if(percentage < 1){
                this.tweenCamera( easeInOutCubic(percentage) );
                this.ambience.intensity = 0.3 - percentage * 0.3;
                this.spotlight.intensity = 0.5 - percentage * 0.1;
            }
            /*
            const rotation = ((now - this.timer) % 20000) * 2 * Math.PI / 20000;
            this.surface.rotation.z = rotation;
            this.snake.blocks.forEach( block => {
                block.mesh.rotation.z = rotation;
            });
            this.apples.forEach( apple => {
                apple.mesh.rotation.z = rotation;
            });*/
        }

        this.renderer.render( this.scene, this.camera );
        if(!this.paused) requestAnimationFrame( this.render.bind(this) );
    }

    pause(){
        this.paused = true;
        
        this.spotlight.intensity = 0.4;
        this.ambience.intensity = 0;
        this.render();

        this.els.pauseButton.style.backgroundImage = "url(assets/icons/play.svg)";
        this.interfaces.gamePaused.container.classList.add('visible');
    }
    
    unpause(){
        this.paused = false; 
        
        this.spotlight.intensity = 0.5;
        this.ambience.intensity = 0.3;

        this.els.pauseButton.style.backgroundImage = "url(assets/icons/pause.svg)";
        this.interfaces.gamePaused.container.classList.remove('visible');
        this.render();
    }


    animate(fun, start, duration){
        return new Promise( (resolve, reject) => {
            const now = Date.now(), elapsed = now - start, percentage = elapsed/duration;
            if(elapsed > duration){
                fun(1);
                resolve();
            }
            else{
                fun(percentage);
                requestAnimationFrame( ( () => { (this.animate(fun,start,duration)).then( () => { resolve() } ) } ).bind(this) );
            }
        });
    }

    tweenCamera(percentage){
        this.camera.position.set( ...this.cameraData.position.initial.clone().add(this.cameraData.position.delta.clone().multiplyScalar(percentage)).toArray() );
        
        this.camera.lookAt( this.cameraData.lookAt.initial.clone().add(this.cameraData.lookAt.delta.clone().multiplyScalar(percentage)) );

        this.spotlight.position.set( ...this.cameraData.position.initial.clone().add(this.cameraData.position.delta.clone().multiplyScalar(percentage)).toArray() );
            
        /*let RotationMatrix = new THREE.Matrix4();
        RotationMatrix.makeRotationAxis(snake.head.normal.clone().negate(),debugAn);
        camera.position.set(new THREE.Vector3(0,0,0));
        camera.applyMatrix4(RotationMatrix);*/

        this.camera.up = this.cameraData.up.initial.clone().add(this.cameraData.up.delta.clone().multiplyScalar(percentage));
    }

    checkCollisions(){
        if(this.snake.collisionNotChecked){
            this.snake.collisionNotChecked = false;

            const snake_position = this.snake.position;
            this.apples.forEach( apple => {
                let apple_position = apple.position;
                if(apple_position.x == snake_position.x && apple_position.y == snake_position.y){
                    destroyMesh(apple.mesh, this.scene);
                    this.snake.length += 1;
                    this.apples = [];
                    this.path += Math.round( (Date.now() - this.gameStartTime) / 1000 ) + ";";
                    this.updateScore(100);
                    
                    this.appleSound.currentTime = 0;
                    if(this.soundEffects) this.appleSound.play();
                }
            });

            let first = true;
            this.snake.positions.forEach( snake_block => {
                if(first){ //head
                    first = false;
                    return;
                }
                if(snake_position.x == snake_block.x && snake_position.y == snake_block.y) this.gameOver();
            });

        }
    }

    gameOver(){
        document.getElementById('container').removeEventListener('touchmove', banScrolling);
        document.getElementById('container').scrollTop = 0;

        this.snake.die();
        this.snake.velocity = {x:0,y:0};
        this.surrenderUserControl();

        this.dieSound.currentTime = 0;
        if(this.soundEffects) this.dieSound.play();
        
        this.timer = Date.now();
        this.interval = 3000;

        let side = Math.sign(this.camera.position.z);
        if(side == 0) side = 1;
        const normal = new THREE.Vector3(-side*0.5,0,side).normalize();
        this.cameraData = this.getCameraTween(normal, new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), 18, this.camera, this.cameraData);
        
        setTimeout( () => { 
            this.interfaces.header.container.classList.remove('visible');
            this.interfaces.gameOver.container.classList.add('visible');
        }, 1500 );

        let data = JSON.stringify({
            score: this.score,
            duration: Math.round((Date.now() - this.gameStartTime) / 1000),
            path: btoa(this.path)
        });
        this.els.gameOverScoreInterface.innerHTML = "<p>Submitting score...</p>";
        this.els.gameOverScore.innerHTML = this.score.toString().padStart(6,'0');
        submitScore(data).then( result => {
            handleScoreInterface(result, data, this.els.gameOverScoreInterface);
        }).catch(error => {
            handleScoreInterface({success: false}, data, this.els.gameOverScoreInterface);
        });

        let hiScore = localStorage.getItem('snake_hi');
        

    }

    updateApples(gameHasBegun){
        if(this.apples.length == 0){
            let x, y;
            let overlap = true;

            let avoidX = -1, avoidY = -1;
            if(!gameHasBegun){
                avoidX = this.snake.x;
                avoidY = this.snake.y;
            }

            while(overlap || avoidX == x || avoidY == y){    
                overlap = false;

                x = Math.round(Math.random() * (this.surfaceDimensions.w - 1));
                y = Math.round(Math.random() * (this.surfaceDimensions.h - 1));

                this.snake.positions.forEach( position => {
                    if(position.x == x && position.y == y) overlap = true;
                });
            }

            const apple = new Apple(x,y,this.surfaceDimensions);

            apple.addToScene(this.scene);
            this.apples.push(apple);
        }
    }

    updateScore(n){
        this.score += n;
        this.els.score.innerHTML = this.score.toString().padStart(6,0);

        let hiScore = getHiScore(this.score);
        this.els.hiScore.innerHTML = hiScore.toString().padStart(6,0);
    }

}

class TorusObject{
    constructor(){
        //("new TorusObject");
    }

    addToScene(scene){
        this.blocks.forEach( block => {
            block.addToScene( scene );
        });
    }

    get position(){ return this.blocks[0].position }

    get positions(){
        let posArray = [];
        this.blocks.forEach( block => {
            posArray.push(block.position);
        });
        return posArray;
    }

}

class Snake extends TorusObject{
    constructor(x,y,l,T,scene){
        super();
        
        this.x = x;
        this.y = y;
        this.length = l;
        this.T = T;
        this.scene = scene;
        this.velocity = {x: 1, y: 0};
        this.alive = true;

        this.nextMoveTimer = 0;
        this.start = Date.now();

        let blocks = [];
        for(let i = 0; i < l; i++){
            blocks.push( new TorusBlock(x - i, y, T, 0x8BC34A) );
        }
        this.blocks = blocks;
        this.head = blocks[0];

    }

    die(){
        this.alive = false;
        this.blocks.forEach( block => {
            block.mesh.material.color.setHex(0x999999);
        });
    }

    move(){

        this.x = ((this.x + this.velocity.x) % this.T.w + this.T.w) % this.T.w;
        this.y = ((this.y + this.velocity.y) % this.T.h + this.T.h) % this.T.h;

        //if( touch apple ){}
        //else{
        this.newHead(this.scene);
        if(this.blocks.length > this.length) this.removeTail(this.scene);

        this.nextMoveTimer = 0;
        this.start = Date.now();
        this.collisionNotChecked = true;
    }

    removeTail(scene){
        let tail = this.blocks[this.blocks.length - 1];
        destroyMesh(tail.mesh, scene);
        this.blocks.pop();
    }

    newHead(scene){
        this.head.mesh.material.color.setHex(0x8BC34A);

        let head = new TorusBlock(this.x, this.y, this.T, 0x558B2F);
        this.head = head;
        this.blocks.unshift( head );
        head.addToScene( scene );
    }

    removeAll(scene){
        this.blocks.forEach( block => {
            destroyMesh(block.mesh, scene);
        });
    }

    getFuturePositionVectors(duration){
        const extraMove = ( (this.nextMoveTimer - (Date.now() - this.start)) <= (duration % 250) ) ? 1 : 0,
        moves = Math.floor(duration / 250) + extraMove;
        
        const pos = {x: ( (this.x + moves*this.velocity.x)  % this.T.w + this.T.w) % this.T.w, y: ( (this.y + moves*this.velocity.y)  % this.T.h + this.T.h) % this.T.h},
        offset = 0.03;

        let cartesian_points = [ [pos.x+offset,pos.y+offset], [pos.x+1-offset,pos.y+offset], [pos.x+1-offset,pos.y+1-offset], [pos.x+offset,pos.y+1-offset] ],
        points = [];
    
        cartesian_points.forEach( p => {
            points.push( cartesianToToroidal(...p, this.T) );
        });

        const upperMidpoint = [], lowerMidpoint = [];
        for(let i=0;i<3;i++){
            upperMidpoint[i] = (points[0][i] + points[1][i]) / 2;
            lowerMidpoint[i] = (points[2][i] + points[3][i]) / 2;
        }

        let direction = [];
        for(let i=0;i<3;i++){
            direction[i] = points[1][i] - points[0][i];
        }
        direction = new THREE.Vector3(...direction).normalize();
        
        const triangle = new THREE.Triangle( new THREE.Vector3(...points[0]), new THREE.Vector3(...points[1]), new THREE.Vector3(...lowerMidpoint) );
        let normal = new THREE.Vector3();
        triangle.getNormal(normal);
        normal = normal.normalize();

        return {x: pos.x, y: pos.y, normal: normal, direction: direction, upperMidpoint: new THREE.Vector3(...upperMidpoint)}

    }

}

class Apple extends TorusObject{
    constructor(x,y,T){
        super();

        this.x = x;
        this.y = y;
        this.T = T;

        const apple = new TorusBlock(x,y,T, 0x992B2E);
        this.mesh = apple.mesh;
        this.blocks = [apple];
    }
}

class TorusBlock{
    constructor(x,y,T,color){
        this.x = x;
        this.y = y;
        this.position = {x: x, y: y};

        this.createMesh(x, y, T, color);
    }

    addToScene( scene ){
        scene.add( this.mesh );
    }


    createMesh(x, y, T, color){
    
        const offset = 0.03;
        let cartesian_points = [ [x+offset,y+offset], [x+1-offset,y+offset], [x+1-offset,y+1-offset], [x+offset,y+1-offset] ];
        let points = [];
    
        cartesian_points.forEach( p => {
            points.push( cartesianToToroidal(...p, T) );
        });
    
        const upperMidpoint = [], lowerMidpoint = [];
        for(let i=0;i<3;i++){
            upperMidpoint[i] = (points[0][i] + points[1][i]) / 2;
            lowerMidpoint[i] = (points[2][i] + points[3][i]) / 2;
        }
        this.upperMidpoint = new THREE.Vector3(...upperMidpoint);

        let direction = [];
        for(let i=0;i<3;i++){
            direction[i] = points[1][i] - points[0][i];
        }
        this.direction = new THREE.Vector3(...direction).normalize();

        let extrude_points = this.calculateExtrudePoints(points, upperMidpoint, lowerMidpoint, 0.25);
    
        const triangle = new THREE.Triangle( new THREE.Vector3(...points[0]), new THREE.Vector3(...points[1]), new THREE.Vector3(...lowerMidpoint) );
        let normal = new THREE.Vector3();
        triangle.getNormal(normal);
        this.normal = normal.normalize();

        let forwardTriangle = new THREE.Triangle( new THREE.Vector3(extrude_points[0]), new THREE.Vector3(upperMidpoint), new THREE.Vector3(extrude_points[1]) );
        let forwardNormal = new THREE.Vector3();
        forwardTriangle.getNormal(forwardNormal);
        this.forwardNormal = forwardNormal;

        const vertices = [
            //front
            {pos: extrude_points[0]},
            {pos: extrude_points[1]},
            {pos: extrude_points[2]},
    
            {pos: extrude_points[2]},
            {pos: extrude_points[3]},
            {pos: extrude_points[0]},
    
            //right
            {pos: extrude_points[2]},
            {pos: points[2]},
            {pos: points[1]},
            
            {pos: points[1]},
            {pos: extrude_points[1]},
            {pos: extrude_points[2]},
    
            //back
            {pos: points[0]},
            {pos: points[1]},
            {pos: points[2]},
    
            {pos: points[2]},
            {pos: points[3]},
            {pos: points[0]},
    
            //left
            {pos: extrude_points[0]},
            {pos: points[0]},
            {pos: points[3]},
            
            {pos: points[3]},
            {pos: extrude_points[3]},
            {pos: extrude_points[0]},
    
            //top
            {pos: extrude_points[0]},
            {pos: points[0]},
            {pos: points[1]},
            
            {pos: points[1]},
            {pos: extrude_points[1]},
            {pos: extrude_points[0]},
    
            //bottom
            {pos: extrude_points[2]},
            {pos: points[2]},
            {pos: points[3]},
            
            {pos: points[3]},
            {pos: extrude_points[3]},
            {pos: extrude_points[2]}
        ];
    
        const positions = [];
        const normals = [];
        const uvs = [];
        for (const vertex of vertices) {
            positions.push(...vertex.pos);
            //normals.push(...vertex.norm);
            //uvs.push(...vertex.uv);
        }
    
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute(new Float32Array(positions), 3) );
    
        const material = new THREE.MeshPhongMaterial( { color: color, flatShading: true } );
        
        material.side = THREE.DoubleSide;
        let block = new THREE.Mesh( geometry, material ) ;

        this.mesh = block;
    }

    calculateExtrudePoints(points, upperMidpoint, lowerMidpoint, depth){

        const top_triangle = new THREE.Triangle( new THREE.Vector3(...points[0]), new THREE.Vector3(...points[1]), new THREE.Vector3(...lowerMidpoint) );
        const top_normal = new THREE.Vector3();
        top_triangle.getNormal(top_normal);

        const top_left_point = new THREE.Vector3(...points[0]).add(top_normal.clone().multiplyScalar(depth));
        const top_right_point = new THREE.Vector3(...points[1]).add(top_normal.clone().multiplyScalar(depth));

        const bottom_triangle = new THREE.Triangle( new THREE.Vector3(...points[2]), new THREE.Vector3(...points[3]), new THREE.Vector3(...upperMidpoint) );
        const bottom_normal = new THREE.Vector3();
        bottom_triangle.getNormal(bottom_normal);

        const bottom_left_point = new THREE.Vector3(...points[3]).add(bottom_normal.clone().multiplyScalar(depth));
        const bottom_right_point = new THREE.Vector3(...points[2]).add(bottom_normal.clone().multiplyScalar(depth));

        return [top_left_point.toArray(), top_right_point.toArray(), bottom_right_point.toArray(), bottom_left_point.toArray()];
    }
}

class Interface{
    constructor(id, clickSound){
        this.container = document.getElementById(id);
        this.options = {};


        const flashingOptions = this.container.getElementsByClassName('flashing-options');
        let first = true;
        if(flashingOptions && flashingOptions[0]){
            [...flashingOptions[0].getElementsByClassName('flashing-option')].forEach( option => {
                const label = option.dataset.id;
                this.options[label] = option;

                if(first){ option.classList.add('focus'); first = false }
                option.addEventListener('mouseover', () => {
                    Object.values(this.options).forEach( otherOption => otherOption.classList.remove('focus') );
                    option.classList.add('focus');
                });

                option.addEventListener('click', () => {

                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    const audioCtx = new AudioContext();

                    let soundEffects = localStorage.getItem('snake_sound_effects');
                    if(!soundEffects || parseInt(soundEffects) == 1) clickSound.play();
                });
            });
        }

    }

    show(){ this.container.classList.add('visible') }
    hide(){ this.container.classList.remove('visible') }
}

if(typeof Promise.any === "function"){
    Promise.any([
        new Promise( (resolve,reject) => { window.addEventListener('load', () => { resolve() }) }),
        new Promise( (resolve,reject) => { window.addEventListener('DOMContentLoaded', () => { resolve() }) })
    ]).then( () => {
        const PressStart2P = new FontFace('Press Start 2P', 'url(https://fonts.gstatic.com/s/pressstart2p/v9/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2)');
        document.fonts.add(PressStart2P);
    });
}
else{
    window.addEventListener('load', () => {
        const PressStart2P = new FontFace('Press Start 2P', 'url(https://fonts.gstatic.com/s/pressstart2p/v9/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2)');
        document.fonts.add(PressStart2P);
    });
    window.addEventListener('DOMContentLoaded', () => {
        const PressStart2P = new FontFace('Press Start 2P', 'url(https://fonts.gstatic.com/s/pressstart2p/v9/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2)');
        document.fonts.add(PressStart2P);
    });
}


window.addEventListener('DOMContentLoaded', () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    hijackHeader();

    squeezeElements();

    let clickSound = new Audio("assets/audio/move.mp3");
    clickSound.volume = 0.2;

    let interfaces = { header: new Interface('game-header', clickSound), mainMenu: new Interface('game-start-interface', clickSound), leaderboard: new Interface('leaderboard-interface', clickSound), options: new Interface('options-interface', clickSound), footer: new Interface('game-footer', clickSound), gameOver: new Interface('game-over-interface', clickSound), gamePaused: new Interface('game-paused-interface', clickSound) };

    interfaces.leaderboard.leaderboardContainer = document.getElementById('leaderboard-container');

    setTimeout( () => {
        document.fonts.ready.then( () => {
            buildSubtitle();
            interfaces.mainMenu.show();
            interfaces.footer.show();
            setTimeout(squeezeElements, 1);
        });
    }, 1);

    let els = {
        score: document.getElementById('score'),
        hiScore: document.getElementById('high-score'),
        gameOverScoreInterface: document.getElementById('game-over-score-interface'),
        gameOverScore: document.getElementById('game-over-score'),
        pauseButton: document.getElementById('header-pause-button'),
        soundButton: document.getElementById('header-sound-button'),
        qualityButton: document.getElementById('header-quality-button')
    }

    let playClickSound = () => {
        let soundEffects = localStorage.getItem('snake_sound_effects');
        if(!soundEffects || parseInt(soundEffects) == 1) clickSound.play();
    }
    document.getElementById('header-pause-button').addEventListener('click', playClickSound);
    document.getElementById('header-quality-button').addEventListener('click', playClickSound);
    document.getElementById('header-sound-button').addEventListener('click', () => {
        let soundEffects = localStorage.getItem('snake_sound_effects');
        if(parseInt(soundEffects) == 0) clickSound.play();
    });

    let level = new Level(window.innerWidth, window.innerHeight, els, interfaces);

    window.addEventListener('resize', () => {
        level.renderer.setSize(window.innerWidth, window.innerHeight);
        level.camera.aspect = window.innerWidth / window.innerHeight;
        level.camera.updateProjectionMatrix();
        
        squeezeElements();
    });

    els.hiScore.innerHTML = getHiScore(0).toString().padStart(6,0);

    interfaces.leaderboard.options.back.addEventListener('click', () => { interfaces.leaderboard.hide(); interfaces.mainMenu.show(); interfaces.footer.show() });
    interfaces.options.options.back.addEventListener('click', () => { interfaces.options.hide(); interfaces.mainMenu.show(); interfaces.footer.show() });
    interfaces.gameOver.options.menu.addEventListener('click', () => { 
        interfaces.gameOver.hide(); interfaces.mainMenu.show(); interfaces.footer.show();
        level.reset();
    });

    interfaces.mainMenu.options.start.addEventListener('click', level.startGame.bind(level));
    interfaces.mainMenu.options.leaderboard.addEventListener('click', () => {
        interfaces.mainMenu.hide();
        interfaces.footer.hide();
        interfaces.leaderboard.show();
        downloadLeaderboard(interfaces.leaderboard);
    });
    interfaces.mainMenu.options.options.addEventListener('click', () => { interfaces.mainMenu.hide(); interfaces.footer.hide(); interfaces.options.show() });

    interfaces.gamePaused.options.resume.addEventListener('click', level.unpause.bind(level));
    interfaces.gamePaused.options.quit.addEventListener('click', () => {
        (level.unpause.bind(level))();
        (level.gameOver.bind(level))();
    });

    let qualityOptionsData = [{label:"Low", param:0},{label:"Medium", param:1},{label:"High", param:2},{label:"Max", param:3}];
    installOptions(qualityOptionsData, document.getElementById('quality-options-container'), (p) => {
        level.setQuality(p);
    }, (p) => {
        return level.quality == p.toString();
    }, clickSound);

    let swipeOptionsData = [{label:"Natural", param:1},{label:"Inverted", param:-1}];
    installOptions(swipeOptionsData, document.getElementById('swipe-options-container'), (p) => {
        level.setSwipeDirection(p);
    }, (p) => {
        return level.swipeDirection == p.toString();
    }, clickSound);

    let soundEffectsData = [{label:"On", param:1},{label:"Off", param:0}];
    installOptions(soundEffectsData, document.getElementById('sound-options-container'), (p) => {
        level.setSoundEffects(p);
    }, (p) => {
        return level.soundEffects == p;
    }, clickSound);

    let T = {r: 8, t: 3, w: 28, h: 16};
    
    let torus = createTorus(...Object.values(T));
    level.addObject(torus);
    level.surface = torus;
    level.surfaceDimensions = T;

    let snake = new Snake(0, 13, 3, T, level.scene);
    snake.addToScene(level.scene);
    level.snake = snake;

    var color = 0xffffff;
    const spotlight = new THREE.DirectionalLight(color, 0.4);
    spotlight.position.set(...new THREE.Vector3(0.5,0,-1).normalize().multiplyScalar(18).toArray());
    //spotlight.target.position.set(0, 0, 0);
    //scene.add(spotlight);
    //scene.add(spotlight.target);
    level.addObject(spotlight);
    level.spotlight = spotlight;

    //const apple = new Apple(10,10,T);
    //apple.addToScene(level.scene);
    level.playAnimation();


});

function installOptions(data,container,clickFun,selectFun, clickSound){
    let divs = [];
    for(let i=0;i<data.length;i++){
        if(window.devicePixelRatio <= 1 && data[i].label == "Max") continue;

        let option = document.createElement('div');
        divs.push(option);
        option.classList.add('option-button');

        if(selectFun(data[i].param)) option.classList.add('selected');

        option.innerHTML = data[i].label;

        option.addEventListener('click', () => { 
            divs.forEach( op => op.classList.remove('selected') );
            option.classList.add('selected');
            clickFun(data[i].param);
            
            let soundEffects = localStorage.getItem('snake_sound_effects');
            if(!soundEffects || parseInt(soundEffects) == 1) clickSound.play();
        });

        container.appendChild(option);
    }
}

function downloadLeaderboard(interface){
    interface.leaderboardContainer.innerHTML = "Downloading leaderboard...";

    let download = new Promise( (resolve,reject) => {
        fetch('get_leaderboard.php').then( r => r.json() ).then( scores => {
            resolve(scores);
        }).catch( error => {
            reject(error);
        })
    });

    download.then( scores => {
        interface.leaderboardContainer.innerHTML = "";

        let position = 0, hold = 1, previousScore = -1;
        scores.forEach(row => {
            if(row.position && row.score > previousScore) return;

            let container = document.createElement('div');
            container.classList.add('table-row');

            if(row.you) container.classList.add('highlighted');

            let positionCell = document.createElement('div');
            positionCell.classList.add('table-cell','position-cell');
            
            if(previousScore == row.score) hold++;
            else{
                position += hold;
                hold = 1;
                previousScore = row.score;
            }

            if(position <= 3){
                let medal = document.createElement('div');
                medal.classList.add('medal');
                medal.dataset.position = position;
                positionCell.appendChild(medal);
            }
            let positionCellMarker = document.createElement('span');
            if(row.position) positionCellMarker.innerHTML = row.position + ".";
            else positionCellMarker.innerHTML = position + ".";
            positionCell.appendChild(positionCellMarker);


            let user = document.createElement('div');
            user.classList.add('table-cell','username-cell');
            user.innerHTML = row.username;

            let dots = document.createElement('div');
            dots.classList.add('table-dots');

            let score = document.createElement('div');
            score.classList.add('table-cell');
            score.innerHTML = row.score.toString().padStart(6,'0');

            container.appendChild(positionCell);
            container.appendChild(user);
            container.appendChild(dots);
            container.appendChild(score);

            interface.leaderboardContainer.appendChild(container);
        });

    }).catch( error => {
        interface.leaderboardContainer.innerHTML = "There was an error downloading the leaderboard."
    });
}

function createTorus(r, t, w, h){
    const geometry = new THREE.TorusGeometry( r, t, h, w );
    const material = new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } );
    const torus = new THREE.Mesh( geometry, material );
    return torus;
}

function destroyMesh(mesh, scene){
    scene.remove( mesh );
}

function easeInOutCubic(x){
    return x < 0.5 ? 4 * Math.pow(x,3) : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function buildSubtitle(){
    let subtitle = document.getElementById('logo-subtitle'), count = 0;
    "ON A TORUS".split("").forEach( letter => {
        if(letter == " "){
            const div = document.createElement('div');
            div.classList.add('subtitle-spacer');
            subtitle.appendChild(div);
        }
        else{
            const div = document.createElement('div');
            div.classList.add('subtitle-letter-container');

            const span = document.createElement('span');
            span.innerHTML = letter;
            span.style.fontSize = (5 - Math.abs(count - 3.5)*0.2 - Math.abs(count-2.2)*0.1 ) + "rem";
            span.style.transform = "rotateY(" + (70 - 140*count/7) + "deg)";
            
            let color = Math.round(255 - Math.abs(count - 3.5)*10);
            span.style.color = "rgb(" + color + "," + color + "," + color + ")";

            //span.style.margin = "0 " + -Math.abs(count - 3.5) * 4.5 + "px";
            //span.style.textShadow = -(count-3.5)*10 + "px 8px " + (16 - Math.abs(count-3.5)*5) + "px rgba(0,0,0,.5)";

            let textShadow = "";
            const rgb = "rgb(" + (color-55) + "," + (color-55) + "," + (color-55) + ")";
            for(i=1;i<=20;i++){
                if(i > 1) textShadow += ", ";
                let offset = (-(count-3.5)/3.5 * i).toFixed(2);
                textShadow += offset + "px 0 1px " + rgb;
            }
            textShadow += ", 0 8px 10px rgb(0,0,0)";
            span.style.textShadow = textShadow;

            div.appendChild(span);
            subtitle.appendChild(div);

            let rect = span.getBoundingClientRect();
            div.style.width = (rect.width + 5) + "px";

            count++;
        }
    });
}

function cartesianToToroidal(x,y,T){
    const theta = (x / T.w) * 2 * Math.PI % (2 * Math.PI),
    phi = (y / T.h) * 2 * Math.PI % (2 * Math.PI);
    let point = [ Math.cos(theta) * (T.r + T.t * Math.cos(phi)), Math.sin(theta) * (T.r + T.t * Math.cos(phi)), T.t * Math.sin(phi) ];
    return point;
}

function getHiScore(currentScore){
    let hiScore = localStorage.getItem('snake_hi');
    if(!hiScore){
        localStorage.setItem('snake_hi', currentScore);
        hiScore = currentScore;
    }
    else if(hiScore < currentScore){
        localStorage.setItem('snake_hi', currentScore);
        hiScore = currentScore;
    }
    return hiScore;
}

function handleScoreInterface(result, data, container){
    container.innerHTML = "";

    if("id" in result){
        data = JSON.parse(data);
        data.id = result.id;
        data = JSON.stringify(data);
    }

    let flashingOptions = document.createElement('div');
    flashingOptions.classList.add('flashing-options');

    if(result.success){
        if(result.login_status == false){
            let p = document.createElement('p');
            p.innerHTML = "Log in to submit your score to the leaderboard.";
            
            let logInOption = createFlashingOption('LOG IN');
            let logInOptionHandler = new LoginHandler(logInOption);

            let tryAgainOption = createFlashingOption('SUBMIT');
            tryAgainOption.addEventListener('click', () => {
                container.innerHTML = "<p>Submitting score...</p>";
                submitScore(data).then( result => {
                    handleScoreInterface(result, data, container);
                }).catch(error => {
                    handleScoreInterface({success: false}, data, container); 
                });
            });

            container.appendChild(p);
            flashingOptions.appendChild(logInOption);
            flashingOptions.appendChild(tryAgainOption);
            container.appendChild(flashingOptions);
        }
        else{
            let p = document.createElement('p');
            p.innerHTML = "logged in, total success - placement = " + result.position;

            if(result.position && parseInt(result.position) <= 10) p.innerHTML = "Congratulations! You are position <span class='highlighted'>" + result.position + "</span> on the leaderboard!";
            else if(result.position) p.innerHTML = "You are position <span class='highlighted'>" + result.position + "</span> on the leaderboard!";
            else p.innerHTML = "Your score has been submitted to the leaderboard.";

            container.appendChild(p);
        }

    }
    else{
        let p = document.createElement('p');
        p.innerHTML = "Something went wrong, and your score couldn't be submitted to the leaderboard.";
        let option = createFlashingOption('TRY AGAIN');
        option.addEventListener('click', () => {
            container.innerHTML = "<p>Submitting score...</p>";
            submitScore(data).then( result => {
                handleScoreInterface(result, data, container);
            }).catch(error => {
                handleScoreInterface({success: false}, data, container);
            });
        });
        container.appendChild(p);
        flashingOptions.appendChild(option);
        container.appendChild(flashingOptions);
    }

}

function submitScore(data){
    return new Promise( (resolve, reject) => {
        if(!window.navigator.onLine) reject({success:false});
        else{
            fetch('submit_score.php', {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: data
            }).then( r => r.json()).then( r => {
                resolve(r);
            }).catch(error => {
                reject({success:false});
            });
        }
    });
}

function createFlashingOption(label){
    let option = document.createElement('div');
    option.classList.add('flashing-option');
    let optionArrow = document.createElement('div');
    optionArrow.classList.add('flashing-option-arrow');
    let optionLabel = document.createElement('div');
    optionLabel.classList.add('flashing-option-label');
    optionLabel.innerHTML = label;

    option.appendChild(optionArrow);
    option.appendChild(optionLabel);
    return option;
}



class LoginHandler{
    constructor(button, editButton){
        this.loginButton = button;
        this.loginButton.addEventListener('click', this.openLoginWindow.bind(this));

        this.editButton = editButton;

        getLoginStatus().then( status => {
            this.handleNewStatus(status);
        });
    }

    openLoginWindow(){
        const url = "https://tennessine.co.uk/account/" + ( (!this.status) ? "?quit=1" : "");

        var win = window.open(url,"_blank");
        var checkWinStatus = setInterval( () => {
            if(!win) clearInterval(checkWinStatus);
            if(win.closed){
                getLoginStatus().then( status => {
                    this.handleNewStatus(status);
                });
                clearInterval(checkWinStatus);
            }
        }, 500);
    }

    handleNewStatus(status){
        if(this.editButton){
            if(status.status == 0) this.loginButton.innerHTML = "Log in";
            else this.loginButton.innerHTML = status.user;
        }
        if(status.status == 0) document.getElementById('header-login-id-a').innerHTML = "Log in";
        else document.getElementById('header-login-id-a').innerHTML = status.user;

        this.status = status.status;
        this.user = status.user;
    }
    
}

function getLoginStatus(){
    return new Promise( (resolve,reject) => {
        fetch('login_status.php').then( r => r.json() ).then( status => {
            resolve(status);
        });
    });
}

function hijackHeader(){
    let loginButton = document.getElementById('header-login-id-a');
    loginButton.removeAttribute('href');
    loginButton.innerHTML = "";
    let headerControl = new LoginHandler(loginButton, true);
}

function squeezeElements(){
    let divs = document.querySelectorAll('[data-squeeze]');
    divs.forEach(div => {
        let size = 3.5;
        while(div.clientWidth < div.scrollWidth && size >= 2){
            size -= 0.1;
            div.style.fontSize = size + "rem";
        }

        if(size < 2) div.style.wordBreak = "break-word";
        else div.style.wordBreak = "normal";
    });
}

function banScrolling(event){
    event.preventDefault();
}