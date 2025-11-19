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
        this.GRID_HEIGHT = 15;
        
        // Игровое состояние
        this.map = [];
        this.units = [];
        this.cities = [];
        this.selectedUnit = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateMap();
        this.setupInitialState();
        this.gameLoop();
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
        this.generateMap();
        this.setupInitialState();
        this.updateUI();
    }

    generateMap() {
        this.map = [];
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                // Простая генерация карты - позже можно улучшить
                const types = ['grass', 'forest', 'mountain', 'water'];
                const weights = [0.6, 0.2, 0.1, 0.1];
                const type = this.weightedRandom(types, weights);
                
                row.push({
                    type: type,
                    explored: Math.random() > 0.7, // Часть карты открыта в начале
                    x: x,
                    y: y
                });
            }
            this.map.push(row);
        }
    }

    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        return items[0];
    }

    setupInitialState() {
        // Добавляем стартовый город
        const startX = Math.floor(this.GRID_WIDTH / 4);
        const startY = Math.floor(this.GRID_HEIGHT / 2);
        
        this.cities.push({
            x: startX,
            y: startY,
            level: 1,
            population: 1,
            tribe: this.selectedTribe
        });

        // Добавляем стартового юнита
        this.units.push({
            x: startX + 1,
            y: startY,
            type: 'warrior',
            tribe: this.selectedTribe,
            moves: 2,
            maxMoves: 2
        });
    }

    handleMapClick(x, y) {
        const gridX = Math.floor(x / this.TILE_SIZE);
        const gridY = Math.floor(y / this.TILE_SIZE);
        
        if (gridX >= 0 && gridX < this.GRID_WIDTH && gridY >= 0 && gridY < this.GRID_HEIGHT) {
            // Если кликнули на юнита
            const clickedUnit = this.units.find(unit => unit.x === gridX && unit.y === gridY);
            if (clickedUnit && clickedUnit.tribe === this.selectedTribe) {
                this.selectedUnit = clickedUnit;
                return;
            }

            // Если юнит выбран, пытаемся переместить
            if (this.selectedUnit && this.selectedUnit.moves > 0) {
                if (this.canMoveTo(this.selectedUnit, gridX, gridY)) {
                    this.moveUnit(this.selectedUnit, gridX, gridY);
                    this.selectedUnit.moves--;
                }
            }

            // Открываем территорию при перемещении
            this.map[gridY][gridX].explored = true;
        }
    }

    canMoveTo(unit, targetX, targetY) {
        const distance = Math.abs(unit.x - targetX) + Math.abs(unit.y - targetY);
        return distance === 1 && this.isTilePassable(targetX, targetY);
    }

    isTilePassable(x, y) {
        if (x < 0 || x >= this.GRID_WIDTH || y < 0 || y >= this.GRID_HEIGHT) return false;
        
        const tile = this.map[y][x];
        return tile.type !== 'water' && tile.type !== 'mountain';
    }

    moveUnit(unit, targetX, targetY) {
        unit.x = targetX;
        unit.y = targetY;
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
        
        this.updateUI();
    }

    updateUI() {
        document.getElementById('starsCount').textContent = this.stars;
        document.getElementById('turnCount').textContent = this.turn;
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawMap();
        this.drawCities();
        this.drawUnits();
        this.drawSelection();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    drawMap() {
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const tile = this.map[y][x];
                
                if (!tile.explored) {
                    this.drawTile(x, y, '#2d3047');
                    continue;
                }

                let color;
                switch (tile.type) {
                    case 'grass': color = '#7ec850'; break;
                    case 'forest': color = '#3a7d34'; break;
                    case 'mountain': color = '#8d99ae'; break;
                    case 'water': color = '#4a90e2'; break;
                    default: color = '#7ec850';
                }

                this.drawTile(x, y, color);
                
                // Рисуем сетку
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.strokeRect(
                    x * this.TILE_SIZE,
                    y * this.TILE_SIZE,
                    this.TILE_SIZE,
                    this.TILE_SIZE
                );
            }
        }
    }

    drawTile(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.TILE_SIZE,
            y * this.TILE_SIZE,
            this.TILE_SIZE,
            this.TILE_SIZE
        );
    }

    drawCities() {
        this.cities.forEach(city => {
            const x = city.x * this.TILE_SIZE;
            const y = city.y * this.TILE_SIZE;
            
            this.ctx.fillStyle = this.getTribeColor(city.tribe);
            this.ctx.beginPath();
            this.ctx.arc(x + this.TILE_SIZE/2, y + this.TILE_SIZE/2, this.TILE_SIZE/2 - 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Центр города
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(x + this.TILE_SIZE/2, y + this.TILE_SIZE/2, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawUnits() {
        this.units.forEach(unit => {
            const x = unit.x * this.TILE_SIZE;
            const y = unit.y * this.TILE_SIZE;
            
            this.ctx.fillStyle = this.getTribeColor(unit.tribe);
            this.ctx.beginPath();
            this.ctx.arc(x + this.TILE_SIZE/2, y + this.TILE_SIZE/2, this.TILE_SIZE/3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Символ юнита
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('W', x + this.TILE_SIZE/2, y + this.TILE_SIZE/2);
        });
    }

    drawSelection() {
        if (this.selectedUnit) {
            const x = this.selectedUnit.x * this.TILE_SIZE;
            const y = this.selectedUnit.y * this.TILE_SIZE;
            
            this.ctx.strokeStyle = '#ffeb3b';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
        }
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
