/* Direct-stiffness axial bar formulation, matching frame_toolkit.py's EA/L bar stiffness.
   This browser subset has two translation DOFs per node, without frame bending. */
(function (scope) {
  'use strict';
  function linearSolve(matrix, rhs) {
    const a = matrix.map((row, i) => [...row, rhs[i]]);
    const n = rhs.length;
    const norm = Math.max(...matrix.flat().map(Math.abs));
    for (let k = 0; k < n; k++) {
      let pivot = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i;
      if (Math.abs(a[pivot][k]) < norm * 1e-12 || !Number.isFinite(a[pivot][k])) throw new Error('The model is unstable. Add supports or triangulate the members.');
      [a[k], a[pivot]] = [a[pivot], a[k]];
      for (let i = k + 1; i < n; i++) {
        const factor = a[i][k] / a[k][k];
        for (let j = k; j <= n; j++) a[i][j] -= factor * a[k][j];
      }
    }
    const result = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let value = a[i][n];
      for (let j = i + 1; j < n; j++) value -= a[i][j] * result[j];
      result[i] = value / a[i][i];
    }
    return result;
  }
  function solveTruss(model) {
    const { nodes, members } = model;
    if (nodes.length < 2 || nodes.length > 24 || !members.length || members.length > 64) throw new Error('Use 2-24 nodes and 1-64 members.');
    const n = nodes.length * 2, K = Array.from({ length: n }, () => Array(n).fill(0));
    const F = [], fixed = new Set(), ids = new Map();
    nodes.forEach((node, i) => {
      if (ids.has(node.id)) throw new Error('Every node needs a unique ID.');
      ids.set(node.id, i);
      if (![node.x, node.y, node.fx, node.fy].every(Number.isFinite)) throw new Error(`Node ${node.id}: enter valid positions and loads.`);
      F.push(node.fx * 1000, node.fy * 1000);
      if (['pin', 'x'].includes(node.support)) fixed.add(2 * i);
      if (['pin', 'y'].includes(node.support)) fixed.add(2 * i + 1);
    });
    const bars = members.map((member) => {
      const i = ids.get(member.a), j = ids.get(member.b);
      if (i === undefined || j === undefined) throw new Error(`Member ${member.id}: choose existing nodes.`);
      const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, L = Math.hypot(dx, dy);
      if (i === j || L < 1e-8) throw new Error(`Member ${member.id}: its nodes must be at different positions.`);
      if (!Number.isFinite(member.E) || !Number.isFinite(member.A) || member.E <= 0 || member.A <= 0) throw new Error(`Member ${member.id}: modulus and area must be positive.`);
      const c = dx / L, s = dy / L, direction = [-c, -s, c, s];
      const dofs = [2 * i, 2 * i + 1, 2 * j, 2 * j + 1];
      const axial = member.E * 1e9 * member.A * 1e-6 / L;
      for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) K[dofs[p]][dofs[q]] += axial * direction[p] * direction[q];
      return { ...member, dofs, direction, axial };
    });
    const free = Array.from({ length: n }, (_, i) => i).filter(i => !fixed.has(i));
    if (!fixed.size) throw new Error('Add supports before solving the model.');
    const u = Array(n).fill(0);
    if (free.length) {
      const uf = linearSolve(free.map(i => free.map(j => K[i][j])), free.map(i => F[i]));
      free.forEach((dof, i) => { u[dof] = uf[i]; });
    }
    const reactions = K.map((row, i) => row.reduce((sum, k, j) => sum + k * u[j], 0) - F[i]);
    const forces = bars.map(bar => ({ id: bar.id, force: bar.axial * bar.dofs.reduce((sum, dof, i) => sum + u[dof] * bar.direction[i], 0), area: bar.A }));
    const balance = Math.hypot(...[0, 1].map(axis => nodes.reduce((sum, node, i) => sum + F[2 * i + axis] + (fixed.has(2 * i + axis) ? reactions[2 * i + axis] : 0), 0)));
    return { u, reactions, forces, fixed: [...fixed], balance, maxDisplacement: Math.max(...nodes.map((_, i) => Math.hypot(u[2 * i], u[2 * i + 1]))) };
  }
  const node = (id, x, y, support = 'free', fy = 0, fx = 0) => ({ id, x, y, support, fy, fx });
  const makeMembers = pairs => pairs.map(([a, b], i) => ({ id: i + 1, a, b, E: 200, A: 1000 }));
  const presets = {
    warren: { nodes: [node(1, 0, 0, 'pin'), node(2, 3, 0, 'free', -20), node(3, 6, 0, 'y'), node(4, 1.5, 2), node(5, 4.5, 2)], members: makeMembers([[1,2],[2,3],[1,4],[4,2],[2,5],[5,3],[4,5]]) },
    triangle: { nodes: [node(1, 0, 0, 'pin'), node(2, 4, 0, 'y'), node(3, 2, 3, 'free', -20)], members: makeMembers([[1,2],[1,3],[2,3]]) },
    bar: { nodes: [node(1, 0, 0, 'pin'), node(2, 2, 0, 'y', 0, 10)], members: makeMembers([[1,2]]) }
  };
  const api = { solveTruss, presets };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.TrussEngine = api;
})(typeof window === 'undefined' ? {} : window);
