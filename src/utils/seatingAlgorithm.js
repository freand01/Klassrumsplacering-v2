import { ALGORITHM_CONSTANTS } from './constants';

export class SeatingOptimizer {
  constructor({ students, constraints, desks, lockedDesks, plans }) {
    this.students = students;
    this.constraints = constraints;
    this.desks = JSON.parse(JSON.stringify(desks)); 
    this.lockedDesks = new Set(lockedDesks || []);
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

    this.frontDeskIds = new Set();
    this.wallDeskIds = new Set();
    this.soloDeskIds = new Set();

    this.desks.forEach(desk => {
      if (desk.y <= minY + 180) this.frontDeskIds.add(desk.id); // Längst fram
      if (desk.x <= minX + 180 || (desk.x + desk.width) >= maxX - 180) this.wallDeskIds.add(desk.id); // Vid vägg
      if (desk.capacity === 1) this.soloDeskIds.add(desk.id); // Ensam
    });

    this.flatSeats = [];
    this.desks.forEach(desk => {
      for (let i = 0; i < desk.capacity; i++) {
        this.flatSeats.push({
          deskId: desk.id,
          seatIndex: i,
          isLocked: this.lockedDesks.has(desk.id),
          student: this.lockedDesks.has(desk.id) && desk.students ? (desk.students[i] || null) : null
        });
      }
    });
  }

  generateSeating() {
    const pastPairs = this.buildPastPairs();
    let grid = this.flatSeats.map(s => ({ ...s }));
    let pool = [...this.students];

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
    frontGroup.forEach(s => { if (!place(s, seat => this.frontDeskIds.has(seat.deskId))) place(s); });

    const wallGroup = pool.filter(s => s.needsWall); pool = pool.filter(s => !s.needsWall);
    wallGroup.forEach(s => { if (!place(s, seat => this.wallDeskIds.has(seat.deskId))) place(s); });

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
      const { student, deskId } = seat;
      if (student.needsFront && !this.frontDeskIds.has(deskId)) score += ALGORITHM_CONSTANTS.ROW_PENALTY_MULTIPLIER * 10;
      if (student.needsWall && !this.wallDeskIds.has(deskId)) score += 500;
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
    let count = 0;
    // Förenklad räkning här
    return count; 
  }
}
