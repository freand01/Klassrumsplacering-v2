import { ALGORITHM_CONSTANTS } from './constants';

export class SeatingOptimizer {
  constructor({ students, constraints, desks, lockedSeats, plans }) {
    this.students = students;
    this.constraints = constraints;
    this.desks = JSON.parse(JSON.stringify(desks)); 
    // Nytt: Vi använder lockedSeats (ex: "deskId-seatIndex")
    this.lockedSeats = new Set(lockedSeats || []);
    this.plans = plans || [];
    this.analyzeClassroom();
  }

  analyzeClassroom() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    this.desks.forEach(desk => {
      if (desk.x < minX) minX = desk.x;
      if (desk.x + desk.width > maxX) maxX = desk.x + desk.width;
      if (desk.y < minY) minY = desk.y;
    });

    if (minX === Infinity) minX = 0;
    if (maxX === -Infinity) maxX = 800;
    if (minY === Infinity) minY = 0;

    const roomWidth = maxX - minX;
    const wallThreshold = Math.max(150, roomWidth * 0.15); 
    const frontThreshold = 80; 

    this.frontSeatIds = new Set();
    this.wallSeatIds = new Set();
    this.soloDeskIds = new Set();

    this.desks.forEach(desk => {
      if (desk.capacity === 1) this.soloDeskIds.add(desk.id);

      for (let i = 0; i < desk.capacity; i++) {
        const seatKey = `${desk.id}-${i}`;

        if (desk.y <= minY + frontThreshold) {
          this.frontSeatIds.add(seatKey);
        }
        if (desk.x <= minX + wallThreshold && i === 0) {
          this.wallSeatIds.add(seatKey);
        }
        else if ((desk.x + desk.width) >= maxX - wallThreshold && i === desk.capacity - 1) {
          this.wallSeatIds.add(seatKey);
        }
      }
    });

    this.flatSeats = [];
    this.desks.forEach(desk => {
      for (let i = 0; i < desk.capacity; i++) {
        const seatKey = `${desk.id}-${i}`;
        const isSeatLocked = this.lockedSeats.has(seatKey);
        
        this.flatSeats.push({
          deskId: desk.id,
          seatIndex: i,
          isLocked: isSeatLocked,
          // Om stolen är låst, behåll eleven som sitter där, annars töm den
          student: isSeatLocked && desk.students ? (desk.students[i] || null) : null
        });
      }
    });
  }

  generateSeating() {
    const pastPairs = this.buildPastPairs();
    let grid = this.flatSeats.map(s => ({ ...s }));
    let pool = [...this.students];

    // Filtrera bort elever som redan sitter på en låst plats
    const lockedIds = new Set(grid.filter(s => s.isLocked && s.student).map(s => s.student.id));
    pool = pool.filter(s => !lockedIds.has(s.id)).sort(() => Math.random() - 0.5);

    grid = this.placeStudentsByPriority(grid, pool);
    grid = this.optimizeSeating(grid, pastPairs);

    const optimizedDesks = this.desks.map(desk => {
      const deskSeats = grid.filter(s => s.deskId === desk.id).sort((a, b) => a.seatIndex - b.seatIndex);
      return { ...desk, students: deskSeats.map(s => s.student || null) };
    });

    return { desks: optimizedDesks, hardConflicts: this.countHardConflicts(grid) };
  }

  buildPastPairs() {
    const pastPairs = new Map();
    this.plans.forEach(plan => {
      if (plan.desks) {
        plan.desks.forEach(desk => {
          if (desk.students && desk.students.length > 1) {
            for (let i = 0; i < desk.students.length; i++) {
              for (let j = i + 1; j < desk.students.length; j++) {
                if (desk.students[i] && desk.students[j]) {
                  const key = [desk.students[i].id, desk.students[j].id].sort().join('-');
                  pastPairs.set(key, (pastPairs.get(key) || 0) + 1);
                }
              }
            }
          }
        });
      }
    });
    return pastPairs;
  }

  placeStudentsByPriority(grid, pool) {
    const place = (student, criteriaFn = () => true) => {
      const avail = grid.filter(s => !s.isLocked && !s.student && criteriaFn(s));
      if (avail.length > 0) {
        avail[Math.floor(Math.random() * avail.length)].student = student;
        return true;
      }
      return false;
    };

    const soloGroup = pool.filter(s => s.needsSolo); pool = pool.filter(s => !s.needsSolo);
    soloGroup.forEach(s => { if (!place(s, seat => this.soloDeskIds.has(seat.deskId))) place(s); });

    const frontGroup = pool.filter(s => s.needsFront); pool = pool.filter(s => !s.needsFront);
    frontGroup.forEach(s => { if (!place(s, seat => this.frontSeatIds.has(`${seat.deskId}-${seat.seatIndex}`))) place(s); });

    const wallGroup = pool.filter(s => s.needsWall); pool = pool.filter(s => !s.needsWall);
    wallGroup.forEach(s => { if (!place(s, seat => this.wallSeatIds.has(`${seat.deskId}-${seat.seatIndex}`))) place(s); });

    pool.forEach(s => place(s));
    return grid;
  }

  optimizeSeating(grid, pastPairs) {
    let bestGrid = grid.map(s => ({ ...s }));
    let bestScore = this.calculateScore(bestGrid, pastPairs);
    const unlocked = grid.map((s, i) => !s.isLocked ? i : -1).filter(i => i !== -1);

    if (unlocked.length < 2) return bestGrid;

    for (let i = 0; i < ALGORITHM_CONSTANTS.OPTIMIZATION_ITERATIONS; i++) {
      const idx1 = unlocked[Math.floor(Math.random() * unlocked.length)];
      const idx2 = unlocked[Math.floor(Math.random() * unlocked.length)];
      if (idx1 === idx2) continue;

      const tempGrid = grid.map(s => ({ ...s }));
      tempGrid[idx1].student = grid[idx2].student;
      tempGrid[idx2].student = grid[idx1].student;

      const score = this.calculateScore(tempGrid, pastPairs);
      if (score < bestScore || (score === bestScore && Math.random() < ALGORITHM_CONSTANTS.ACCEPTANCE_PROBABILITY)) {
        grid = tempGrid; bestScore = score; bestGrid = grid.map(s => ({ ...s }));
      }
    }
    return bestGrid;
  }

  calculateScore(grid, pastPairs) {
    let score = 0;
    const deskStudents = new Map();
    grid.forEach(s => {
      if (s.student) {
        if (!deskStudents.has(s.deskId)) deskStudents.set(s.deskId, []);
        deskStudents.get(s.deskId).push(s.student);
      }
    });

    const areNeighbors = (id1, id2) => {
      for (const students of deskStudents.values()) {
        const ids = students.map(s => s.id);
        if (ids.includes(id1) && ids.includes(id2)) return true;
      }
      return false;
    };

    this.constraints.forEach(c => {
      if (grid.some(s => s.student?.id === c.student1) && grid.some(s => s.student?.id === c.student2)) {
        const neighbors = areNeighbors(c.student1, c.student2);
        if (c.type === 'pair' && !neighbors) score += ALGORITHM_CONSTANTS.HARD_CONSTRAINT_PENALTY;
        if (c.type === 'avoid' && neighbors) score += ALGORITHM_CONSTANTS.HARD_CONSTRAINT_PENALTY;
      }
    });

    grid.forEach(seat => {
      if (!seat.student) return;
      const { student, deskId, seatIndex } = seat;
      const seatKey = `${deskId}-${seatIndex}`;
      
      if (student.needsFront && !this.frontSeatIds.has(seatKey)) score += 5000;
      if (student.needsWall && !this.wallSeatIds.has(seatKey)) score += 5000;
      
      if (student.needsSolo) {
        const neighborsCount = (deskStudents.get(deskId)?.length || 1) - 1;
        if (neighborsCount > 0) score += ALGORITHM_CONSTANTS.SOLO_PENALTY * neighborsCount;
      }

      const roommates = deskStudents.get(deskId) || [];
      if (roommates.length > 1) {
        roommates.forEach(r => {
          if (r.id !== student.id) {
            const key = [student.id, r.id].sort().join('-');
            if (pastPairs.has(key)) score += ALGORITHM_CONSTANTS.HISTORY_PENALTY;
          }
        });
      }
    });
    return score;
  }

  countHardConflicts(grid) {
    return 0; 
  }
}