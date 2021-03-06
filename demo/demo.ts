/* eslint-disable  @typescript-eslint/no-explicit-any */

import {
  WebGraph,
  Utils,
  Layout,
  DEFAULT_FORCEATLAS2_ITERATIONS,
  AppMode,
  NodeType,
  LabelSelector,
} from "../src/index";
import { SerializedEdge, SerializedNode } from "graphology-types";
import Graph, { MultiGraph } from "graphology";

/**---------------------------------------------------------------------------
 * Graph drawing
 *--------------------------------------------------------------------------*/
let webGraph: WebGraph | undefined = undefined;
let graph: Graph | undefined = undefined;
const webGraphContainer = document.getElementById("webGraph");
const webGraphContextMenuContainer = document.getElementById("webGraphCM");
const webGraphNodeInfoBox = document.getElementById("webGraphNIB");
const status = document.getElementById("status");

async function drawFullGraph(graphDataJSON: any[]) {
  if (!webGraphContainer) {
    throw new Error("No div container with the ID 'webGraph' has been found.");
  }

  if (!webGraphContextMenuContainer) {
    throw new Error(
      "No div container with the ID 'webGraphCM' has been found."
    );
  }

  if (!webGraphNodeInfoBox) {
    throw new Error(
      "No div container with the ID 'webGraphNIB' has been found."
    );
  }

  graph = new MultiGraph();

  const COLOR_PALETTE = [
    "#EDAE49",
    "#D1495B",
    "#00798C",
    "#30638E",
    "#003D5B",
    "#BBBDF6",
  ];

  let minScore = Infinity;
  let maxScore = -Infinity;
  let minYear = Infinity;
  let maxYear = -Infinity;

  graphDataJSON.forEach((node) => {
    if (node.score < minScore) minScore = node.score;
    if (node.score > maxScore) maxScore = node.score;
    if (node.year < minYear) minYear = node.year;
    if (node.year > maxYear) maxYear = node.year;
  });

  // create nodes
  graphDataJSON.forEach((result) => {
    graph?.addNode(result.id, {
      label: result.author + ", " + result.year,
      size: Utils.getNodeSizeForValue(result.score, minScore, maxScore, 4),
      category: result.category,
      color: Utils.getNodeColorForValue(
        result.year,
        minYear,
        maxYear,
        COLOR_PALETTE
      ),
      score: result.score,
      important: result.important,
      cluster: result.cluster,
    });
  });

  // add edges after all nodes have been added
  graphDataJSON.forEach((result) => {
    if (result.cluster !== undefined) {
      result.refs.forEach((ref: string) => {
        graph?.addEdge(result.id, ref, {
          weight: 0.1,
          color: "#ccc",
          important: Math.random() > 0.7,
        });
      });
    }
  });

  if (webGraph?.isRenderingActive) webGraph.destroy();

  // initialize and render graph
  webGraph = new WebGraph(webGraphContainer, graph, {
    layout: Layout.FORCEATLAS2,
    initializeForceAtlas2WebWorker: true,
    layoutConfiguration: {
      forceAtlas2LayoutOptions: {
        iterations: DEFAULT_FORCEATLAS2_ITERATIONS,
        initialWebWorkerRuntime: undefined,
        preAppliedLayout: Layout.CIRCULAR,
        settings: {
          edgeWeightInfluence: 2.0,
          barnesHutOptimize: true,
        },
      },
    },
    appMode: AppMode.DYNAMIC,
    nodeInfoBox: {
      container: webGraphNodeInfoBox,
      cssShow: "show-hover",
      cssHide: "hide",
      xoffset: -75,
      yoffset: 20,
      callback: {
        0: async (key: string, score?: number) => {
          const dataJson: any = await fetch(
            "http://localhost:9002/node?q=" + key
          )
            .then((response) => response.json())
            .then((json) => json);

          if (!dataJson) return { header: "error" };

          return {
            preheader: dataJson.year,
            header: dataJson.title,
            content: dataJson.abstract,
            footer: "Score: " + score,
          };
        },
        1: async (key: string) => {
          const dataJson: any = await fetch(
            "http://localhost:9002/node?q=" + key
          )
            .then((response) => response.json())
            .then((json) => json);

          if (!dataJson) return { header: "error" };

          return {
            preheader: dataJson.year,
            header: dataJson.title,
            content: dataJson.abstract,
          };
        },
      },
    },
    contextMenus: {
      container: webGraphContextMenuContainer,
      cssHide: "hide",
      cssShow: "show",
      entries: {
        0: [
          {
            label: "drop node",
            callback: (key: string) => webGraph?.dropNodes([key]),
          },
          {
            label: "type triangle",
            callback: (key: string) =>
              webGraph?.mergeNodes([
                { key: key, attributes: { type: NodeType.TRIANGLE } },
              ]),
          },
          {
            label: "type rectangle",
            callback: (key: string) =>
              webGraph?.mergeNodes([
                { key: key, attributes: { type: NodeType.RECTANGLE } },
              ]),
          },
          {
            label: "highlight node",
            callback: (key: string) => webGraph?.highlightNode(key, 2000),
          },
        ],
        1: [
          {
            label: "drop node",
            callback: (key: string) => webGraph?.dropNodes([key]),
          },
          {
            label: "hide node",
            callback: (key: string) =>
              webGraph?.mergeNodes([
                { key: key, attributes: { hidden: true } },
              ]),
          },
          {
            label: "show node",
            callback: (key: string) =>
              webGraph?.mergeNodes([
                { key: key, attributes: { hidden: false } },
              ]),
          },
          {
            label: "highlight node",
            callback: (key: string) => webGraph?.highlightNode(key, 2000),
          },
        ],
      },
    },
    suppressContextMenu: false,
    defaultNodeType: NodeType.CIRCLE,
    showNodeInfoBoxOnClick: true,
    highlightSubGraphOnHover: true,
    includeImportantNeighbors: true,
    importantNeighborsBidirectional: true,
    importantNeighborsColor: "#fcabb2",
    enableHistory: true,
    labelSelector: LabelSelector.SIGMA,
    sigmaSettings: {
      renderLabels: true,
      labelFontColor: "#8e8e8e",
      renderNodeBackdrop: true,
      clusterColors: { 0: "#d1fce9", 1: "#d1dcfc", 2: "#fcd4cc", 3: "#fafcbd" },
    },
  });

  webGraph.on("rendered", () => console.log("graph rendered"));
  webGraph.on("syncLayoutCompleted", () => console.log("syncLayoutCompleted"));
  webGraph.on("initialFA2wwStarted", () => console.log("initialFA2wwStarted"));
  webGraph.on("initialFA2wwCompleted", () =>
    console.log("initialFA2wwCompleted")
  );

  webGraph.on("clickNode", (e) => console.log("clickNode: ", e));
  webGraph.on("rightClickNode", (e) => console.log("rightClickNode: ", e));
  webGraph.on("dragNode", (e) => console.log("dragNode: ", e));
  webGraph.on("draggedNode", (e) => console.log("draggedNode: ", e));
  webGraph.on("enterNode", (e) => console.log("enterNode: ", e));
  webGraph.on("leaveNode", (e) => console.log("leaveNode: ", e));

  webGraph.on("nodeInfoBoxOpened", (e) =>
    console.log("nodeInfoBoxOpened: ", e)
  );
  webGraph.on("nodeInfoBoxClosed", (e) =>
    console.log("nodeInfoBoxClosed: ", e)
  );
  webGraph.on("contextMenuOpened", (e) =>
    console.log("contextMenuOpened: ", e)
  );
  webGraph.on("contextMenuClosed", (e) =>
    console.log("contextMenuClosed: ", e)
  );

  webGraph.render();

  if (status) {
    status.innerHTML = "Idle";
  }
}

function drawGraph(json: any[], baseUrl: string): void {
  if (!webGraphContainer) {
    throw new Error("No div container with the ID 'webGraph' has been found.");
  }

  if (!webGraphContextMenuContainer) {
    throw new Error(
      "No div container with the ID 'webGraphCM' has been found."
    );
  }

  if (!webGraphNodeInfoBox) {
    throw new Error(
      "No div container with the ID 'webGraphNIB' has been found."
    );
  }

  if (webGraph?.isRenderingActive) webGraph.destroy();

  graph = new MultiGraph();

  json.forEach((result) => {
    graph?.addNode(result.id, {
      label: result.author + ", " + result.year,
      size: 10,
      category: 0,
      color: "#30638E",
      score: result.score,
      important: result.important,
    });
  });

  const contextMenus = {
    container: webGraphContextMenuContainer,
    cssHide: "hide",
    cssShow: "show",
    entries: {
      0: [
        {
          label: "Load 1 Node",
          callback: (key: string) => loadNNodes(1, key, baseUrl),
        },
        {
          label: "Load 5 Nodes",
          callback: (key: string) => loadNNodes(5, key, baseUrl),
        },
        {
          label: "Load 10 Nodes",
          callback: (key: string) => loadNNodes(10, key, baseUrl),
        },
      ],
    },
  };

  webGraph = new WebGraph(webGraphContainer, graph, {
    layout: Layout.CIRCLEPACK,
    layoutConfiguration: {
      forceAtlas2LayoutOptions: {
        iterations: 0,
        initialWebWorkerRuntime: 100,
        preAppliedLayout: Layout.CIRCULAR,
        settings: {
          edgeWeightInfluence: 2.0,
          barnesHutOptimize: true,
        },
      },
    },
    initializeForceAtlas2WebWorker: true,
    contextMenus: contextMenus,
  });

  webGraph.render();
}

function loadNNodes(n: number, key: string, url: string): void {
  fetchGraphData(url + n).then((json) => {
    const newNodes = Array<SerializedNode>();
    const newEdges = new Set<SerializedEdge>();

    const nodeData = graph?.getNodeAttributes(key);
    if (!nodeData) return;

    json.forEach((node) => {
      const newID = node.id + Math.random() * Math.random();

      const angle = Math.random() * Math.PI * 2;

      newNodes.push({
        key: newID,
        attributes: {
          label: node.author + ", " + node.year,
          x: nodeData.x + Math.cos(angle) / 10,
          y: nodeData.y + Math.sin(angle) / 10,
          category: 0,
          color: "#30638E",
          size: 10,
        },
      });

      newEdges.add({
        source: key,
        target: newID,
        attributes: {
          color: "#e5e5e5",
          weight: 1.0,
        },
      });
    });

    webGraph?.mergeNodes(newNodes);
    webGraph?.mergeEdges(newEdges);

    webGraph?.startForceAtlas2WebWorker();

    setTimeout(() => webGraph?.stopForceAtlas2WebWorker(), 500);
  });
}

function drawExampleGraph() {
  if (!webGraphContainer) {
    throw new Error("No div container with the ID 'webGraph' has been found.");
  }

  graph = new Graph();

  graph.addNode("Node 1", {
    label: "Hello",
    x: 1,
    y: 1,
    color: "#D1495B",
    size: 10,
    type: NodeType.RECTANGLE,
  });

  graph.addNode("Node 2", {
    label: "Graph",
    x: 1,
    y: 0,
    color: "#EDAE49",
    size: 10,
    type: NodeType.TRIANGLE,
  });

  graph.addNode("Node 3", {
    label: "and World!",
    x: 0,
    y: 0,
    color: "#30638E",
    size: 10,
  });

  graph.addEdge("Node 1", "Node 2", {
    weight: 0.5,
    color: "#ccc",
    important: true,
  });
  graph.addEdge("Node 1", "Node 3", { weight: 1.0, color: "#ccc" });

  if (webGraph?.isRenderingActive) webGraph.destroy();

  webGraph = new WebGraph(webGraphContainer, graph);

  webGraph.render();

  if (status) {
    status.innerHTML = "Idle";
  }
}

window.onload = () => {
  if (webGraphContainer === null) return;

  if (status) {
    status.innerHTML = "Working...";
  }
  // render default graph example
  drawExampleGraph();
};

function fetchGraphData(url: string): Promise<any[]> {
  // fetch json resource
  return fetch(url)
    .then((response) => response.json())
    .catch((e) => {
      console.error(e);
      drawExampleGraph();
      if (status) {
        status.innerHTML = "Idle";
      }
    });
}

/**---------------------------------------------------------------------------
 * Settings Menu
 *--------------------------------------------------------------------------*/
/**---------------------------------
 * Settings Menu - API endpoint
 *--------------------------------*/
document.getElementById("graphButton")?.addEventListener("click", async (e) => {
  e.preventDefault();

  const searchEndpointElement = document.getElementById("searchEndpoint");
  const searchGraphRoute = document.getElementById("graphRoute");
  const searchGraphQuery = document.getElementById("graphQuery");

  if (!searchEndpointElement || !searchGraphRoute || !searchGraphQuery) return;

  // parse inputs to url
  const url =
    (<HTMLInputElement>searchEndpointElement).value +
    (<HTMLInputElement>searchGraphRoute).value +
    encodeURIComponent((<HTMLInputElement>searchGraphQuery).value);

  if (status) {
    status.innerHTML = "Working...";
  }

  fetchGraphData(url).then((json) => drawFullGraph(json));
});

/**---------------------------------
 * Settings Menu - Start blank
 *--------------------------------*/

document.getElementById("blankButton")?.addEventListener("click", async (e) => {
  e.preventDefault();

  const searchEndpointElement = document.getElementById("searchEndpoint");
  const blankRoute = document.getElementById("blankRoute");
  const blankAmount = document.getElementById("blankAmount");

  if (!blankAmount || !blankRoute || !searchEndpointElement) return;

  // parse inputs to url
  const baseUrl =
    (<HTMLInputElement>searchEndpointElement).value +
    (<HTMLInputElement>blankRoute).value;
  const url =
    baseUrl + encodeURIComponent((<HTMLInputElement>blankAmount).value);

  fetchGraphData(url).then((json) => drawGraph(json, baseUrl));
});

/**---------------------------------
 * Settings Menu - App Mode
 *--------------------------------*/
document.getElementById("appModeDynamic")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.appMode = AppMode.DYNAMIC;
});

document.getElementById("appModeStatic")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.appMode = AppMode.STATIC;
});

/**---------------------------------
 * Settings Menu - Layout
 *--------------------------------*/
document.getElementById("layoutRandom")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(Layout.RANDOM, {});
});

document.getElementById("layoutCircular")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(Layout.CIRCULAR, {});
});

document.getElementById("layoutCirclePack")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(Layout.CIRCLEPACK, {});
});

document.getElementById("layoutForceAtlas2")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(Layout.FORCEATLAS2, {
    forceAtlas2LayoutOptions: {
      iterations: 25,
      settings: {
        edgeWeightInfluence: 2.0,
      },
    },
  });
});

document.getElementById("layoutReapply")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.reapplyLayout();
});

/**---------------------------------
 * Settings Menu - ForceAtlas2 Web Worker
 *--------------------------------*/
document.getElementById("wwStart")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.startForceAtlas2WebWorker();
});

document.getElementById("wwStop")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.stopForceAtlas2WebWorker();
});

document.getElementById("wwToggle")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleForceAtlas2WebWorker();
});

document.getElementById("wwReset")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(Layout.CIRCLEPACK, {});
});

/**---------------------------------
 * Settings Menu - Edges
 *--------------------------------*/
document.getElementById("edgeShow")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleEdgeRendering(false);
});

document.getElementById("edgeHide")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleEdgeRendering(true);
});

document.getElementById("toggleEdges")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleEdgeRendering();
});

/**---------------------------------
 * Settings Menu - Important Edges
 *--------------------------------*/
document.getElementById("impEdgeShow")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleJustImportantEdgeRendering(true);
});

document.getElementById("impEdgeHide")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleJustImportantEdgeRendering(false);
});

document
  .getElementById("toggleImportantEdges")
  ?.addEventListener("click", (e) => {
    e.preventDefault();

    if (!webGraph || !webGraph.isRenderingActive) return;

    webGraph.toggleJustImportantEdgeRendering();
  });

/**---------------------------------
 * Settings Menu - Default Node Type
 *--------------------------------*/
document.getElementById("typeRing")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.RING);
});

document.getElementById("typeCircle")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.CIRCLE);
});

document.getElementById("typeRectangle")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.RECTANGLE);
});

document.getElementById("typeTriangle")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.TRIANGLE);
});

/**---------------------------------
 * Settings Menu - History
 *--------------------------------*/
document.getElementById("undo")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.undo();
});

document.getElementById("redo")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.redo();
});

document.getElementById("clearHistory")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.clearHistory();
});

/**---------------------------------
 * Settings Menu - Camera
 *--------------------------------*/
document.getElementById("zoomIn")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.camera.animatedUnzoom(0.75);
});

document.getElementById("zoomOut")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.camera.animatedZoom(0.75);
});

document.getElementById("zoomReset")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.camera.animatedReset({});
});

/**---------------------------------
 * Settings Menu - Highlight
 *--------------------------------*/
document.getElementById("highlightNode")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive || !graph) return;

  webGraph.highlightNode(graph?.nodes()[0], 3000);
});

/**---------------------------------
 * Settings Menu - Cluster
 *--------------------------------*/
document.getElementById("toggleCluster")?.addEventListener("click", (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive || !graph) return;

  webGraph.toggleNodeBackdropRendering();
});
