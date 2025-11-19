class PolyEmpireGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectedTribe = 'imperius';
        this.stars = 5;
        this.turn = 1;
        
        // Игровые константы
        this.TILE_SIZE = 40;
        this.GRID_WIDTH = 20;
        this.GRID_HEIGHT = 25;
        
        // Текстуры
        this.textures = {};
        this.texturesLoaded = false;
        
        // Игровое состояние
        this.map = [];
        this.units = [];
        this.cities = [];
        this.selectedUnit = null;
        
        this.init();
    }

    async init() {
        await this.loadTextures();
        this.setupEventListeners();
        this.generateMap();
        this.setupInitialState();
        this.gameLoop();
    }

    async loadTextures() {
        const texturePaths = {
            grass: 'images/texture/grass.png',
            forest: 'images/texture/forest.png',
            mountain: 'images/texture/mountain.png',
            water: 'images/texture/water.png',
            city: 'images/texture/city.png'
        };

        const loadPromises = [];
        
        for (const [name, path] of Object.entries(texturePaths)) {
            loadPromises.push(
                new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        this.textures[name] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Не удалось загрузить текстуру: ${path}`);
                        // Создаем запасной цветной квадрат если текстура не загрузилась
                        const canvas = document.createElement('canvas');
                        canvas.width = this.TILE_SIZE;
                        canvas.height = this.TILE_SIZE;
                        const ctx = canvas.getContext('2d');
                        
                        let color;
                        switch (name) {
                            case 'grass': color = '#7ec850'; break;
                            case 'forest': color = '#3a7d34'; break;
                            case 'mountain': color = '#8d99ae'; break;
                            case 'water': color = '#4a90e2'; break;
                            case 'city': color = '#cccccc'; break;
                            default: color = '#7ec850';
                        }
                        
                        ctx.fillStyle = color;
                        ctx.fillRect(0, 0, this.TILE_SIZE, this.TILE_SIZE);
                        
                        // Добавляем простой паттерн для различия
                        if (name === 'forest') {
                            ctx.fillStyle = '#2a5c24';
                            for (let i = 0; i < 3; i++) {
                                const x = Math.random() * this.TILE_SIZE;
                                const y = Math.random() * this.TILE_SIZE;
                                ctx.beginPath();
                                ctx.arc(x, y, 2, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        } else if (name === 'mountain') {
                            ctx.fillStyle = '#6c757d';
                            ctx.beginPath();
                            ctx.moveTo(10, 5);
                            ctx.lineTo(30, 20);
                            ctx.lineTo(20, 35);
                            ctx.lineTo(5, 25);
                            ctx.closePath();
                            ctx.fill();
                        }
                        
                        this.textures[name] = canvas;
                        resolve();
                    };
                    img.src = path;
                })
            );
        }

        await Promise.all(loadPromises);
        this.texturesLoaded = true;
        console.log('Все текстуры загружены');
    }

    setupEventListeners() {
        document.getElementById('startGame').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('endTurn').addEventListener('click', () => {
            this.endTurn();
        });

        // Выбор племени
        document.querySelectorAll('.tribe').forEach(tribe => {
            tribe.addEventListener('click', () => {
                document.querySelectorAll('.tribe').forEach(t => t.classList.remove('selected'));
                tribe.classList.add('selected');
                this.selectedTribe = tribe.dataset.tribe;
            });
        });

        // Клики по карте
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.handleMapClick(x, y);
        });

        // Клавиши для перемещения выбранного юнита
        document.addEventListener('keydown', (e) => {
            if (!this.selectedUnit) return;
            
            let newX = this.selectedUnit.x;
            let newY = this.selectedUnit.y;
            
            switch(e.key) {
                case 'ArrowUp': newY--; break;
                case 'ArrowDown': newY++; break;
                case 'ArrowLeft': newX--; break;
                case 'ArrowRight': newX++; break;
                default: return;
            }
            
            if (this.canMoveTo(this.selectedUnit, newX, newY)) {
                this.moveUnit(this.selectedUnit, newX, newY);
                this.selectedUnit.moves--;
                this.map[newY][newX].explored = true;
            }
        });
    }

    startGame() {
        document.querySelector('.main-menu').classList.add('hidden');
        document.getElementById('battlefield').classList.remove('hidden');
        this.resetGameState();
    }

    resetGameState() {
        this.stars = 5;
        this.turn = 1;
        this.units = [];
        this.cities = [];
        this.selectedUnit = null;
        this.generateMap();
        this.setupInitialState();
        this.updateUI();
    }

    generateMap() {
        this.map = [];
        
        // Создаем базовую карту с водой по краям и в центре
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                // Более сложная генерация карты
                let type = 'grass';
                const rand = Math.random();
                
                // Вода по краям карты
                if (x < 2 || x > this.GRID_WIDTH - 3 || y < 2 || y > this.GRID_HEIGHT - 3) {
                    type = 'water';
                } 
                // Горы в некоторых местах
                else if (rand < 0.1) {
                    type = 'mountain';
                }
                // Леса
                else if (rand < 0.3) {
                    type = 'forest';
                }
                // Немного воды внутри карты
                else if (rand < 0.15) {
                    type = 'water';
                }
                
                row.push({
                    type: type,
                    explored: Math.random() > 0.5, // Половина карты открыта в начале
                    x: x,
                    y: y,
                    resource: this.generateResource(type)
                });
            }
            this.map.push(row);
        }
    }

    generateResource(tileType) {
        if (tileType === 'forest' && Math.random() < 0.3) {
            return 'fruit';
        }
        if (tileType === 'mountain' && Math.random() < 0.4) {
            return 'minerals';
        }
        return null;
    }

    setupInitialState() {
        // Находим подходящее место для стартового города (не вода, не гора)
        let startX, startY;
        do {
            startX = Math.floor(this.GRID_WIDTH * 0.2 + Math.random() * this.GRID_WIDTH * 0.2);
            startY = Math.floor(this.GRID_HEIGHT * 0.3 + Math.random() * this.GRID_HEIGHT * 0.4);
        } while (this.map[startY][startX].type === 'water' || this.map[startY][startX].type === 'mountain');

        this.cities.push({
            x: startX,
            y: startY,
            level: 1,
            population: 1,
            tribe: this.selectedTribe,
            name: this.generateCityName()
        });

        // Добавляем стартового юнита рядом с городом
        const unitPositions = [
            [startX + 1, startY],
            [startX - 1, startY],
            [startX, startY + 1],
            [startX, startY - 1]
        ];

        for (const [ux, uy] of unitPositions) {
            if (ux >= 0 && ux < this.GRID_WIDTH && uy >= 0 && uy < this.GRID_HEIGHT && 
                this.map[uy][ux].type !== 'water' && this.map[uy][ux].type !== 'mountain') {
                this.units.push({
                    x: ux,
                    y: uy,
                    type: 'warrior',
                    tribe: this.selectedTribe,
                    moves: 2,
                    maxMoves: 2,
                    health: 10,
                    attack: 2
                });
                break;
            }
        }

        // Открываем территорию вокруг стартовой позиции
        this.exploreArea(startX, startY, 3);
    }

    exploreArea(centerX, centerY, radius) {
        for (let y = Math.max(0, centerY - radius); y <= Math.min(this.GRID_HEIGHT - 1, centerY + radius); y++) {
            for (let x = Math.max(0, centerX - radius); x <= Math.min(this.GRID_WIDTH - 1, centerX + radius); x++) {
                this.map[y][x].explored = true;
            }
        }
    }

    generateCityName() {
        const names = ['Альфа', 'Бета', 'Гамма', 'Дельта', 'Эпсилон', 'Зета', 'Эта', 'Тета'];
        return names[Math.floor(Math.random() * names.length)];
    }

    handleMapClick(x, y) {
        const gridX = Math.floor(x / this.TILE_SIZE);
        const gridY = Math.floor(y / this.TILE_SIZE);
        
        if (gridX >= 0 && gridX < this.GRID_WIDTH && gridY >= 0 && gridY < this.GRID_HEIGHT) {
            console.log(`Клик по клетке: ${gridX}, ${gridY}, тип: ${this.map[gridY][gridX].type}`);
            
            // Если кликнули на юнита
            const clickedUnit = this.units.find(unit => unit.x === gridX && unit.y === gridY);
            if (clickedUnit && clickedUnit.tribe === this.selectedTribe) {
                this.selectedUnit = clickedUnit;
                console.log(`Выбран юнит: ${clickedUnit.type}`);
                return;
            }

            // Если кликнули на город
            const clickedCity = this.cities.find(city => city.x === gridX && city.y === gridY);
            if (clickedCity) {
                console.log(`Город: ${clickedCity.name}`);
                // Здесь можно показать меню города
                return;
            }

            // Если юнит выбран, пытаемся переместить
            if (this.selectedUnit && this.selectedUnit.moves > 0) {
                if (this.canMoveTo(this.selectedUnit, gridX, gridY)) {
                    this.moveUnit(this.selectedUnit, gridX, gridY);
                    this.selectedUnit.moves--;
                    this.map[gridY][gridX].explored = true;
                    
                    // Автоматически исследуем соседние клетки
                    this.exploreArea(gridX, gridY, 1);
                }
            }
        }
    }

    canMoveTo(unit, targetX, targetY) {
        const distance = Math.abs(unit.x - targetX) + Math.abs(unit.y - targetY);
        if (distance !== 1) return false;
        
        if (targetX < 0 || targetX >= this.GRID_WIDTH || targetY < 0 || targetY >= this.GRID_HEIGHT) {
            return false;
        }
        
        const targetTile = this.map[targetY][targetX];
        return targetTile.type !== 'water' && targetTile.type !== 'mountain';
    }

    moveUnit(unit, targetX, targetY) {
        console.log(`Перемещение юнита с (${unit.x}, ${unit.y}) на (${targetX}, ${targetY})`);
        unit.x = targetX;
        unit.y = targetY;
        
        // Проверяем, не нашли ли мы деревню для захвата
        this.checkForVillageCapture(unit, targetX, targetY);
    }

    checkForVillageCapture(unit, x, y) {
        // Здесь можно добавить логику захвата нейтральных деревень
        // Пока просто проверяем, не стоит ли юнит на потенциальном месте для города
        const tile = this.map[y][x];
        if (tile.resource && !this.cities.some(city => city.x === x && city.y === y)) {
            console.log(`Обнаружен ресурс: ${tile.resource} на клетке (${x}, ${y})`);
        }
    }

    endTurn() {
        this.turn++;
        // Восстанавливаем перемещение юнитов
        this.units.forEach(unit => {
            if (unit.tribe === this.selectedTribe) {
                unit.moves = unit.maxMoves;
            }
        });
        
        // Добавляем звезды за города
        this.stars += this.cities.length;
        
        // Добавляем бонусные звезды за ресурсы
        this.cities.forEach(city => {
            const cityTile = this.map[city.y][city.x];
            if (cityTile.resource) {
                this.stars += 1; // Бонус за ресурс
            }
        });
        
        this.updateUI();
        console.log(`Ход завершен. Текущий ход: ${this.turn}, Звезд: ${this.stars}`);
    }

    updateUI() {
        document.getElementById('starsCount').textContent = this.stars;
        document.getElementById('turnCount').textContent = this.turn;
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.texturesLoaded) {
            this.drawMap();
            this.drawResources();
            this.drawCities();
            this.drawUnits();
            this.drawSelection();
            this.drawUI();
        } else {
            this.drawLoadingScreen();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }

    drawMap() {
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const tile = this.map[y][x];
                
                if (!tile.explored) {
                    this.drawUnexploredTile(x, y);
                    continue;
                }

                this.drawTile(x, y, tile.type);
            }
        }
    }

    drawTile(x, y, type) {
        const tileX = x * this.TILE_SIZE;
        const tileY = y * this.TILE_SIZE;

        // Рисуем текстуру
        if (this.textures[type]) {
            this.ctx.drawImage(
                this.textures[type], 
                tileX, 
                tileY, 
                this.TILE_SIZE, 
                this.TILE_SIZE
            );
        }

        // Рисуем сетку
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);
    }

    drawUnexploredTile(x, y) {
        const tileX = x * this.TILE_SIZE;
        const tileY = y * this.TILE_SIZE;
        
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);
        
        // Рисуем текстуру тумана войны
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.strokeRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);
    }

    drawResources() {
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const tile = this.map[y][x];
                if (tile.explored && tile.resource) {
                    this.drawResource(x, y, tile.resource);
                }
            }
        }
    }

    drawResource(x, y, resource) {
        const tileX = x * this.TILE_SIZE;
        const tileY = y * this.TILE_SIZE;
        
        this.ctx.fillStyle = this.getResourceColor(resource);
        this.ctx.beginPath();
        this.ctx.arc(
            tileX + this.TILE_SIZE/2, 
            tileY + this.TILE_SIZE/2, 
            4, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Обводка для лучшей видимости
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    getResourceColor(resource) {
        const colors = {
            fruit: '#ff6b6b',
            minerals: '#ffd93d'
        };
        return colors[resource] || '#ffffff';
    }

    drawCities() {
        this.cities.forEach(city => {
            this.drawCity(city.x, city.y, city.tribe, city.level);
        });
    }

    drawCity(x, y, tribe, level) {
        const tileX = x * this.TILE_SIZE;
        const tileY = y * this.TILE_SIZE;
        
        // Основа города
        this.ctx.fillStyle = this.getTribeColor(tribe);
        this.ctx.beginPath();
        this.ctx.arc(
            tileX + this.TILE_SIZE/2, 
            tileY + this.TILE_SIZE/2, 
            this.TILE_SIZE/2 - 4, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Обводка
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Уровень города
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            level.toString(), 
            tileX + this.TILE_SIZE/2, 
            tileY + this.TILE_SIZE/2
        );
    }

    drawUnits() {
        this.units.forEach(unit => {
            this.drawUnit(unit.x, unit.y, unit.type, unit.tribe, unit.moves > 0);
        });
    }

    drawUnit(x, y, type, tribe, canMove) {
        const tileX = x * this.TILE_SIZE;
        const tileY = y * this.TILE_SIZE;
        
        // Основной круг юнита
        this.ctx.fillStyle = this.getTribeColor(tribe);
        this.ctx.beginPath();
        this.ctx.arc(
            tileX + this.TILE_SIZE/2, 
            tileY + this.TILE_SIZE/2, 
            this.TILE_SIZE/3, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Обводка в зависимости от возможности перемещения
        this.ctx.strokeStyle = canMove ? '#ffeb3b' : '#cccccc';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Символ юнита
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            type === 'warrior' ? 'W' : 'U',
            tileX + this.TILE_SIZE/2, 
            tileY + this.TILE_SIZE/2
        );
    }

    drawSelection() {
        if (this.selectedUnit) {
            const x = this.selectedUnit.x * this.TILE_SIZE;
            const y = this.selectedUnit.y * this.TILE_SIZE;
            
            // Анимированное выделение
            const pulse = Math.sin(Date.now() * 0.01) * 2 + 2;
            
            this.ctx.strokeStyle = '#ffeb3b';
            this.ctx.lineWidth = 2 + pulse;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
            this.ctx.setLineDash([]);
            
            // Подсветка доступных ходов
            if (this.selectedUnit.moves > 0) {
                this.drawAvailableMoves(this.selectedUnit);
            }
        }
    }

    drawAvailableMoves(unit) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        directions.forEach(([dx, dy]) => {
            const newX = unit.x + dx;
            const newY = unit.y + dy;
            
            if (this.canMoveTo(unit, newX, newY)) {
                const tileX = newX * this.TILE_SIZE;
                const tileY = newY * this.TILE_SIZE;
                
                this.ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
                this.ctx.fillRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);
                
                this.ctx.strokeStyle = 'rgba(255, 235, 59, 0.6)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);
            }
        });
    }

    drawUI() {
        // Отображение информации о выбранном юните
        if (this.selectedUnit) {
            const infoX = 10;
            const infoY = this.canvas.height - 60;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(infoX, infoY, 200, 50);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Юнит: Воин`, infoX + 10, infoY + 15);
            this.ctx.fillText(`Очки перемещения: ${this.selectedUnit.moves}/${this.selectedUnit.maxMoves}`, infoX + 10, infoY + 30);
            this.ctx.fillText(`Позиция: (${this.selectedUnit.x}, ${this.selectedUnit.y})`, infoX + 10, infoY + 45);
        }
    }

    drawLoadingScreen() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Загрузка текстур...', this.canvas.width/2, this.canvas.height/2);
        
        // Индикатор прогресса
        const loaded = Object.keys(this.textures).length;
        const total = 5; // grass, forest, mountain, water, city
        const progress = (loaded / total) * 100;
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.canvas.width/2 - 100, this.canvas.height/2 + 20, 200, 10);
        this.ctx.fillStyle = '#4ecdc4';
        this.ctx.fillRect(this.canvas.width/2 - 100, this.canvas.height/2 + 20, 200 * (progress/100), 10);
    }

    getTribeColor(tribe) {
        const colors = {
            imperius: '#ff6b6b',
            bardur: '#4ecdc4'
        };
        return colors[tribe] || '#cccccc';
    }
}

// Инициализация игры когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    new PolyEmpireGame();
});
