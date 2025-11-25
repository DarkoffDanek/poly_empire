class PolyEmpireGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectedTribe = null;
        this.gameState = 'tribeSelection';
        this.currentTurn = 1;
        this.stars = 10;
        this.players = [];
        this.map = [];
        this.units = [];
        this.cities = [];
        this.researchedTechs = new Set();
        this.selectedUnit = null;
        this.mapSize = { width: 20, height: 15 };
        this.tileSize = 40;

        this.initializeEventListeners();
        this.generateMap();
    }

    initializeEventListeners() {
        // Выбор племени
        document.querySelectorAll('.tribe-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectTribe(e.currentTarget.dataset.tribe);
            });
        });

        // Кнопки управления
        document.getElementById('endTurn').addEventListener('click', () => this.endTurn());
        document.getElementById('techTreeBtn').addEventListener('click', () => this.showTechTree());
        document.querySelector('.close').addEventListener('click', () => this.hideTechTree());

        // Клик по карте
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Клик по технологиям
        document.querySelectorAll('.tech').forEach(tech => {
            tech.addEventListener('click', (e) => this.researchTech(e.currentTarget));
        });
    }

    selectTribe(tribeId) {
        this.selectedTribe = tribeId;
        document.getElementById('tribeName').textContent = this.getTribeName(tribeId);
        document.getElementById('tribeSelection').classList.add('hidden');
        document.getElementById('mainGame').classList.remove('hidden');
        
        this.applyTribeBonus(tribeId);
        this.initializePlayer();
        this.render();
        
        this.showNotification(`Добро пожаловать, ${this.getTribeName(tribeId)}!`);
    }

    getTribeName(tribeId) {
        const names = {
            'imperius': 'Империус',
            'xin-xi': 'Син-Си',
            'bardur': 'Бардур'
        };
        return names[tribeId] || tribeId;
    }

    applyTribeBonus(tribeId) {
        const bonuses = {
            'imperius': () => {
                // +2 к атаке для всех юнитов
                this.units.forEach(unit => unit.attack += 2);
            },
            'xin-xi': () => {
                // Видение гор
                this.map.forEach(row => {
                    row.forEach(tile => {
                        if (tile.type === 'mountain') tile.explored = true;
                    });
                });
            },
            'bardur': () => {
                // +1 к ресурсам
                this.stars += 5; // Стартовый бонус
            }
        };
        
        if (bonuses[tribeId]) {
            bonuses[tribeId]();
        }
    }

    initializePlayer() {
        // Создаем стартового юнита
        const startX = Math.floor(this.mapSize.width / 4);
        const startY = Math.floor(this.mapSize.height / 2);
        
        this.units.push({
            x: startX,
            y: startY,
            type: 'warrior',
            health: 100,
            attack: 10,
            movement: 3,
            movesLeft: 3,
            tribe: this.selectedTribe
        });

        // Создаем стартовый город
        this.cities.push({
            x: startX,
            y: startY,
            name: this.getTribeName(this.selectedTribe),
            level: 1,
            population: 1,
            income: 2,
            tribe: this.selectedTribe
        });
    }

    generateMap() {
        const terrainTypes = ['grass', 'forest', 'mountain', 'water'];
        
        for (let y = 0; y < this.mapSize.height; y++) {
            const row = [];
            for (let x = 0; x < this.mapSize.width; x++) {
                // Создаем более интересную карту с кластерами
                let type = 'grass';
                if (Math.random() < 0.3) type = 'forest';
                if (Math.random() < 0.1) type = 'mountain';
                if (Math.random() < 0.15) type = 'water';
                
                // Создаем кластеры воды в центре для океана
                const distToCenter = Math.sqrt(
                    Math.pow(x - this.mapSize.width/2, 2) + 
                    Math.pow(y - this.mapSize.height/2, 2)
                );
                if (distToCenter < 3 && Math.random() < 0.8) {
                    type = 'water';
                }

                row.push({
                    type: type,
                    explored: false,
                    resource: Math.random() < 0.1 ? 'fruit' : null
                });
            }
            this.map.push(row);
        }

        // Открываем стартовую область
        this.exploreArea(3, 6, 3);
    }

    exploreArea(centerX, centerY, radius) {
        for (let y = Math.max(0, centerY - radius); y <= Math.min(this.mapSize.height - 1, centerY + radius); y++) {
            for (let x = Math.max(0, centerX - radius); x <= Math.min(this.mapSize.width - 1, centerX + radius); x++) {
                this.map[y][x].explored = true;
            }
        }
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.tileSize);
        const y = Math.floor((e.clientY - rect.top) / this.tileSize);

        // Проверяем клик на юнита
        const clickedUnit = this.units.find(unit => unit.x === x && unit.y === y);
        if (clickedUnit && clickedUnit.tribe === this.selectedTribe) {
            this.selectedUnit = clickedUnit;
            this.updateUnitInfo();
            return;
        }

        // Движение юнита
        if (this.selectedUnit && this.canMoveTo(x, y)) {
            this.moveUnit(this.selectedUnit, x, y);
            this.exploreArea(x, y, 2);
        }
    }

    canMoveTo(x, y) {
        if (x < 0 || x >= this.mapSize.width || y < 0 || y >= this.mapSize.height) return false;
        
        const tile = this.map[y][x];
        if (tile.type === 'water' && !this.researchedTechs.has('fishing')) return false;
        if (tile.type === 'mountain') return false;

        const distance = Math.abs(this.selectedUnit.x - x) + Math.abs(this.selectedUnit.y - y);
        return distance <= this.selectedUnit.movesLeft && !this.units.some(u => u.x === x && u.y === y);
    }

    moveUnit(unit, x, y) {
        const distance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
        unit.movesLeft -= distance;
        unit.x = x;
        unit.y = y;

        // Проверяем, не нашли ли мы деревню
        if (Math.random() < 0.1 && !this.cities.some(city => city.x === x && city.y === y)) {
            this.foundVillage(x, y);
        }

        this.updateUnitInfo();
        this.render();
    }

    foundVillage(x, y) {
        this.cities.push({
            x: x,
            y: y,
            name: `Деревня ${this.cities.length + 1}`,
            level: 1,
            population: 1,
            income: 1,
            tribe: this.selectedTribe
        });

        this.showNotification(`Основана новая деревня! +1 к доходу`);
        this.updateCityInfo();
    }

    researchTech(techElement) {
        const tech = techElement.dataset.tech;
        const cost = parseInt(techElement.dataset.cost);

        if (this.researchedTechs.has(tech)) return;
        if (this.stars < cost) {
            this.showNotification('Недостаточно звёзд!');
            return;
        }

        this.stars -= cost;
        this.researchedTechs.add(tech);
        techElement.classList.add('researched');

        // Применяем эффекты технологий
        this.applyTechEffect(tech);
        this.updateUI();
        this.showNotification(`Исследовано: ${techElement.querySelector('.tech-name').textContent}`);
    }

    applyTechEffect(tech) {
        switch(tech) {
            case 'organization':
                this.cities.forEach(city => {
                    city.income += 1;
                });
                break;
            case 'fishing':
                this.showNotification('Теперь можно перемещаться по воде!');
                break;
            case 'riding':
                // Разблокируем новых юнитов
                this.showNotification('Доступны конные воины!');
                break;
        }
    }

    endTurn() {
        this.currentTurn++;
        
        // Восстанавливаем движение юнитов
        this.units.forEach(unit => {
            unit.movesLeft = unit.movement;
        });

        // Собираем доход
        const income = this.cities.reduce((sum, city) => sum + city.income, 0);
        this.stars += income;

        // Случайные события
        if (Math.random() < 0.2) {
            this.randomEvent();
        }

        this.updateUI();
        this.render();
        this.showNotification(`Ход ${this.currentTurn}. Доход: +${income} звёзд`);
    }

    randomEvent() {
        const events = [
            () => {
                this.stars += 3;
                this.showNotification('Найдены заброшенные руины! +3 звезды');
            },
            () => {
                if (this.units.length > 0) {
                    const unit = this.units[0];
                    unit.attack += 2;
                    this.showNotification('Юниты прошли тренировку! +2 к атаке');
                }
            },
            () => {
                this.cities.forEach(city => {
                    city.population += 1;
                });
                this.showNotification('Бум рождаемости! Население городов увеличено');
            }
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];
        randomEvent();
    }

    updateUI() {
        document.getElementById('stars').textContent = this.stars;
        document.getElementById('turn').textContent = this.currentTurn;
        document.getElementById('techCount').textContent = this.researchedTechs.size;
    }

    updateUnitInfo() {
        const unitDetails = document.getElementById('unitDetails');
        if (this.selectedUnit) {
            unitDetails.innerHTML = `
                <p>Тип: Воин</p>
                <p>Здоровье: ${this.selectedUnit.health}</p>
                <p>Атака: ${this.selectedUnit.attack}</p>
                <p>Движение: ${this.selectedUnit.movesLeft}/${this.selectedUnit.movement}</p>
            `;
        } else {
            unitDetails.innerHTML = '<p>Выберите юнита</p>';
        }
    }

    updateCityInfo() {
        const cityDetails = document.getElementById('cityDetails');
        cityDetails.innerHTML = this.cities.map(city => `
            <div class="city-item">
                <strong>${city.name}</strong><br>
                Уровень: ${city.level}<br>
                Население: ${city.population}<br>
                Доход: ${city.income}
            </div>
        `).join('');
    }

    showTechTree() {
        document.getElementById('techModal').classList.remove('hidden');
    }

    hideTechTree() {
        document.getElementById('techModal').classList.add('hidden');
    }

    showNotification(message) {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка карты
        for (let y = 0; y < this.mapSize.height; y++) {
            for (let x = 0; x < this.mapSize.width; x++) {
                const tile = this.map[y][x];
                if (!tile.explored) continue;

                this.drawTile(x, y, tile);
            }
        }

        // Отрисовка юнитов
        this.units.forEach(unit => {
            this.drawUnit(unit);
        });

        // Отрисовка городов
        this.cities.forEach(city => {
            this.drawCity(city);
        });

        // Обновляем информацию в UI
        this.updateUnitInfo();
        this.updateCityInfo();
    }

    drawTile(x, y, tile) {
        const colors = {
            'grass': '#4a7c59',
            'forest': '#3d6b47',
            'mountain': '#8d99ae',
            'water': '#4361ee'
        };

        this.ctx.fillStyle = colors[tile.type] || '#666';
        this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        
        // Границы тайлов
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

        // Ресурсы
        if (tile.resource === 'fruit') {
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(
                x * this.tileSize + this.tileSize/2,
                y * this.tileSize + this.tileSize/2,
                4, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    drawUnit(unit) {
        this.ctx.fillStyle = unit.tribe === this.selectedTribe ? '#4cc9f0' : '#f08c4c';
        
        // Основной круг юнита
        this.ctx.beginPath();
        this.ctx.arc(
            unit.x * this.tileSize + this.tileSize/2,
            unit.y * this.tileSize + this.tileSize/2,
            this.tileSize/3, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Выделение выбранного юнита
        if (unit === this.selectedUnit) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(
                unit.x * this.tileSize + this.tileSize/2,
                unit.y * this.tileSize + this.tileSize/2,
                this.tileSize/2.5, 0, Math.PI * 2
            );
            this.ctx.stroke();
        }
    }

    drawCity(city) {
        this.ctx.fillStyle = city.tribe === this.selectedTribe ? '#4cc9f0' : '#f08c4c';
        
        // Город - квадрат с башнями
        const size = this.tileSize/2;
        this.ctx.fillRect(
            city.x * this.tileSize + this.tileSize/4,
            city.y * this.tileSize + this.tileSize/4,
            size, size
        );

        // Уровень города
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(
            city.level,
            city.x * this.tileSize + this.tileSize/2 - 3,
            city.y * this.tileSize + this.tileSize/2 + 3
        );
    }
}

// Запуск игры при загрузке страницы
window.addEventListener('load', () => {
    new PolyEmpireGame();
});
