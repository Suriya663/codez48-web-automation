const logger = require('../../core/logger');
/**
 * CODEZ48 TASK GRAPH (STAGE 11)
 * Represents complex multi-application tasks as a directed execution graph with typed edges.
 */

class TaskGraph {
    constructor(taskId, goal) {
        this.taskId = taskId;
        this.goal = goal;
        this.nodes = new Map();
        this.edges = [];
    }

    addNode(nodeId, type, metadata = {}) {
        const node = { nodeId, type, status: 'PENDING', metadata };
        this.nodes.set(nodeId, node);
        return node;
    }

    addEdge(fromNodeId, toNodeId, edgeType = 'SUCCESS') {
        this.edges.push({ from: fromNodeId, to: toNodeId, type: edgeType });
    }

    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }

    getNextNode(currentNodeId, edgeType = 'SUCCESS') {
        const edge = this.edges.find(e => e.from === currentNodeId && e.type === edgeType);
        return edge ? this.nodes.get(edge.to) : null;
    }
}

module.exports = TaskGraph;
