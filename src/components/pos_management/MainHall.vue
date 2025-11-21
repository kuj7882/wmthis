<script setup>

import { ref, watch, reactive, computed } from 'vue';



// Stage 크기 설정

const stageSize = {

  width: window.innerWidth,

  height: window.innerHeight,

};



// 초기 사각형 데이터

const rectangles = ref([]);





const selectedIds = ref([]);

const rectRefs = ref([]);

const transformerRef = ref(null);

const stageRef = ref(null);

const layerRef = ref(null);

const isSelecting = ref(false);

const selectionRectangle = reactive({

  visible: false,

  x1: 0,

  y1: 0,

  x2: 0,

  y2: 0,

});

const newColor = ref('#0000FF');



// 격자 간격 (배경 격자)

const gridSpacing = 20;



// verticalLines와 horizontalLines computed 프로퍼티로 선 좌표 계산

const verticalLines = computed(() => {

  const arr = [];

  for (let x = 0; x <= stageSize.width; x += gridSpacing) {

    arr.push(x);

  }

  return arr;

});

const horizontalLines = computed(() => {

  const arr = [];

  for (let y = 0; y <= stageSize.height; y += gridSpacing) {

    arr.push(y);

  }

  return arr;

});



// 선택된 도형 변경 시 transformer 업데이트

watch(selectedIds, () => {

  if (!transformerRef.value) return;

  const nodes = selectedIds.value.map(id => {

    return rectRefs.value.find(ref => ref.getNode().attrs.id === id)?.getNode();

  }).filter(Boolean);

  transformerRef.value.getNode().nodes(nodes);

});



// 사각형 추가 함수

const addRectangle = () => {

  const newRect = {

    x: 100,

    y: 100,

    width: 100,

    height: 90,

    fill: 'grey',

    id: `rect${rectangles.value.length + 1}`,

  };

  rectangles.value.push(newRect);

};



// 선택된 도형의 색상 변경 함수

const changeColor = () => {

  rectangles.value = rectangles.value.map(rect => {

    if (selectedIds.value.includes(rect.id)) {

      return { ...rect, fill: newColor.value };

    }

    return rect;

  });

};



// 선택된 도형 삭제 함수

const deleteRectangles = () => {

  rectangles.value = rectangles.value.filter(rect => !selectedIds.value.includes(rect.id));

  // 삭제 후 선택 초기화

  selectedIds.value = [];

};



const handleStageClick = (e) => {

  if (selectionRectangle.visible) return;



  if (e.target === e.target.getStage()) {

    selectedIds.value = [];

    return;

  }



  if (!e.target.hasName('rect')) return;



  const clickedId = e.target.attrs.id;

  const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;

  const isSelected = selectedIds.value.includes(clickedId);



  if (!metaPressed && !isSelected) {

    selectedIds.value = [clickedId];

  } else if (metaPressed && isSelected) {

    selectedIds.value = selectedIds.value.filter(id => id !== clickedId);

  } else if (metaPressed && !isSelected) {

    selectedIds.value = [...selectedIds.value, clickedId];

  }

};



const handleMouseDown = (e) => {

  if (e.target !== e.target.getStage()) return;



  isSelecting.value = true;

  const pos = e.target.getStage().getPointerPosition();

  selectionRectangle.visible = true;

  selectionRectangle.x1 = pos.x;

  selectionRectangle.y1 = pos.y;

  selectionRectangle.x2 = pos.x;

  selectionRectangle.y2 = pos.y;

};



const handleMouseMove = (e) => {

  if (!isSelecting.value) return;

  const pos = e.target.getStage().getPointerPosition();

  selectionRectangle.x2 = pos.x;

  selectionRectangle.y2 = pos.y;

};



const handleMouseUp = () => {

  if (!isSelecting.value) return;



  isSelecting.value = false;

  setTimeout(() => { selectionRectangle.visible = false; });



  const selBox = {

    x: Math.min(selectionRectangle.x1, selectionRectangle.x2),

    y: Math.min(selectionRectangle.y1, selectionRectangle.y2),

    width: Math.abs(selectionRectangle.x2 - selectionRectangle.x1),

    height: Math.abs(selectionRectangle.y2 - selectionRectangle.y1),

  };



  const selected = rectangles.value.filter(rect => {

    return Konva.Util.haveIntersection(selBox, {

      x: rect.x, y: rect.y, width: rect.width, height: rect.height

    });

  });

  selectedIds.value = selected.map(rect => rect.id);

};



const handleDragEnd = (e, index) => {

  const rects = [...rectangles.value];

  rects[index] = { ...rects[index], x: e.target.x(), y: e.target.y() };

  rectangles.value = rects;

};



const handleTransformEnd = (e, index) => {

  const node = rectRefs.value[index].getNode();

  const scaleX = node.scaleX();

  const scaleY = node.scaleY();

  node.scaleX(1);

  node.scaleY(1);

  const rects = [...rectangles.value];

  rects[index] = {

    ...rects[index],

    x: node.x(),

    y: node.y(),

    width: Math.max(5, node.width() * scaleX),

    height: Math.max(5, node.height() * scaleY),

  };

  rectangles.value = rects;

};

</script>

<template>

  <div class="main-hall">

    <!-- 도형 추가, 색상 변경, 도형 삭제 버튼 -->

    <div class="canvas-container">

      <v-stage :config="stageSize" @mousedown="handleMouseDown" @mousemove="handleMouseMove"

        @mouseup="handleMouseUp" @click="handleStageClick" ref="stageRef">



        <!-- 메인 도형 레이어 -->

        <v-layer ref="layerRef">

          <v-rect v-for="(rect, i) in rectangles" :key="rect.id" :config="{

            ...rect,

            name: 'rect',

            draggable: true

          }" @dragend="(e) => handleDragEnd(e, i)" @transformend="(e) => handleTransformEnd(e, i)" ref="rectRefs" />

          <v-transformer ref="transformerRef" :config="{

            boundBoxFunc: (oldBox, newBox) => {

              if (newBox.width < 5 || newBox.height < 5) {

                return oldBox;

              }

              return newBox;

            }

          }" />

          <v-rect v-if="selectionRectangle.visible" :config="{

            x: Math.min(selectionRectangle.x1, selectionRectangle.x2),

            y: Math.min(selectionRectangle.y1, selectionRectangle.y2),

            width: Math.abs(selectionRectangle.x2 - selectionRectangle.x1),

            height: Math.abs(selectionRectangle.y2 - selectionRectangle.y1),

            fill: 'rgba(0,0,255,0.5)'

          }" />

        </v-layer>

      </v-stage>



    </div>

    <div class="controls">

      <v-btn @click="addRectangle" style="margin-bottom: 20px;">사각형 추가</v-btn>

       <input type="color" v-model="newColor" @change="changeColor" />

      <v-btn @click="deleteRectangles">도형 삭제</v-btn>

    </div>

  </div>



</template>

<style scoped>

.main-hall {

 display: flex;

 justify-content: center; /* 가로 가운데 정렬 */

 align-items: center; /* 세로 가운데 정렬 */

 margin-top: 100px;

 flex-direction: row;

 height: 100vh;

}

.controls {

 display: flex;

 flex-direction: column;

 justify-content: center; /* 세로 가운데 정렬 */

 align-items: center; /* 가로 가운데 정렬 */

 margin-left: 20px; /* 제거 또는 조정 */

}

.canvas-container {

 position: relative;

 width: 70rem;

 height: 40rem;

 overflow: hidden;

 background-color: aliceblue;

}

</style>  