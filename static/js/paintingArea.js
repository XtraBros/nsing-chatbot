layui.use(function () {
  let laytpl = layui.laytpl;
  let layer = layui.layer;

  // 总数据，包含关联的产品信息
  let shapes = [];

  // 移动端数据
  let merged = []; // 移动端显示的分类数据

  let classTPL = document.getElementById(
    'applicationBlockDiagramClassTPL',
  ).innerHTML; // 获取模板字符
  let classView = document.querySelector('.applicationBlockDiagramClass'); // 视图对象

  let cvs = document.getElementById('paintingArea');
  // 获取设备的DPR  
  let devicePixelRatio = window.devicePixelRatio;

  function paintingArea () {
    let ctx = cvs.getContext('2d');
    let index = -1;

    // 图片宽度/高度
    let w = $('.applicationBlockDiagramImg img').width(),
      h = $('.applicationBlockDiagramImg img').height();

    // 图片在1920宽度下是890px的宽度 
    let newWidth = 890;
    // 计算图片在1920宽度下是890px的高度
    let newHeight = Math.floor((newWidth * h) / w);

    function init () {
      // if ($(document).width() > 768) {
      cvs.width = w;
      cvs.height = h;
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      // } else {
      // 移动端下缩放为50%
      //   cvs.width = w * devicePixelRatio;
      //   cvs.height = h * devicePixelRatio;
      //   cvs.style.width = '100' * devicePixelRatio + '%';
      //   cvs.style.height = '100' * devicePixelRatio + '%';
      //   let ctx = cvs.getContext('2d');
      //   ctx.scale(1 / devicePixelRatio, 1 / devicePixelRatio);
      // }
    }

    init();

    function Rectangle (color, startX, startY, index) {
      this.color = color;
      this.startX = startX;
      this.startY = startY;
      this.endX = startX;
      this.endY = startY;
      this.index = index;
      this.product = [];

      this.minX = function () {
        return Math.min(this.startX, this.endX);
      };
      this.maxX = function () {
        return Math.max(this.startX, this.endX);
      };
      this.minY = function () {
        return Math.min(this.startY, this.endY);
      };
      this.maxY = function () {
        return Math.max(this.startY, this.endY);
      };

      this.draw = function () {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1 * devicePixelRatio;
        if ($(document).width() < 768) {
          ctx.lineWidth = 3;
        }
        ctx.fillStyle = 'transparent';
        ctx.strokeStyle = 'transparent';
        ctx.moveTo(
          this.minX() * devicePixelRatio,
          this.minY() * devicePixelRatio,
        );
        ctx.lineTo(
          this.maxX() * devicePixelRatio,
          this.minY() * devicePixelRatio,
        );
        ctx.lineTo(
          this.maxX() * devicePixelRatio,
          this.maxY() * devicePixelRatio,
        );
        ctx.lineTo(
          this.minX() * devicePixelRatio,
          this.maxY() * devicePixelRatio,
        );
        ctx.lineTo(
          this.minX() * devicePixelRatio,
          this.minY() * devicePixelRatio,
        );
        ctx.fill();
        ctx.lineCap = 'square';
        ctx.stroke();
      };

      this.isInside = function (x, y) {
        return (
          x >= this.minX() &&
          x <= this.maxX() &&
          y >= this.minY() &&
          y <= this.maxY()
        );
      };
    }
    let cX, cY;
    cvs.onmousedown = function (e) {
      let rect = cvs.getBoundingClientRect();
      cX = e.clientX;
      cY = e.clientY;
      let clickX = e.clientX - rect.left;
      let clickY = e.clientY - rect.top;
      let shape = getShepes(clickX, clickY);
      // if (!shape) {
      //   index++;
      //   let shape = new Rectangle('#f00', clickX, clickY, index);
      //   shapes.push(shape);
      //   window.onmousemove = function (e) {
      //     shape.endX = e.clientX - rect.left;
      //     shape.endY = e.clientY - rect.top;
      //   };
      // }

      window.onmouseup = function (e) {
        window.onmousemove = null;
        window.onmouseup = null;
        if (shape) {
          console.log('点击', shape);

          const groupedData = {};

          for (let i = 0; i < shape.product.title.length; i++) {
            const title = shape.product.title[i];
            const newchi = shape.product.newchi[i];

            // 如果这个title还不在groupedData中，初始化它  
            if (!groupedData[title]) {
              groupedData[title] = {
                title,
                newchi: []
              };
            }

            groupedData[title].newchi.push(newchi);
          }
          const mergedData = Object.values(groupedData).map(group => ({
            ...group
          }));

          if ($(document).width() > 768) {
            // 渲染分类
            laytpl(classTPL).render(mergedData, function (str) {
              classView.innerHTML = str;
            });

            // 默认展开
            $('.applicationBlockDiagramClass .list').addClass('active');
            $('.applicationBlockDiagramClass .list .subList').slideDown();
          } else {
            console.log(merged);

            $('.applicationBlockDiagramClass .list .subList').slideUp('fast');

            // 分类展开、产品高亮
            merged.forEach(function (item, index) {
              shape.product.title.forEach(function (item2, index2) {

                if (item2 == item.title) {
                  $('.applicationBlockDiagramClass .list').eq(index).addClass('active').siblings().removeClass('active');
                  $('.applicationBlockDiagramClass .list').eq(index).find('.subList').slideDown();
                  $('.applicationBlockDiagramClass .list .subList a').removeClass('bold');

                  shape.product.value.forEach(function (item3, index3) {
                    $('.applicationBlockDiagramClass .list .subList a').each(function (index4, item4) {
                      if ($(item4).text() == item3) {
                        $(item4).addClass('bold');
                      }
                    });
                  });
                }
              });
            });

          }

        }
        // else {
        //   if (cX == e.clientX && cY == e.clientY) {
        //     shapes.splice(shapes.length - 1, 1);
        //   } else {
        //     console.log('总数据', shapes);
        //   }
        // }
      };
    };

    function getShepes (x, y) {
      for (let i = shapes.length - 1; i >= 0; i--) {
        let s = shapes[i];
        if (s.isInside(x, y)) {
          return s;
        }
      }
      return null;
    }

    function draw () {
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      for (let s of shapes) {
        s.draw();
      }
    }
    draw();

    // document.addEventListener('keydown', function (event) {
    //   if (event.ctrlKey && event.key === 'z' && shapes.length > 0) {
    //     shapes.splice(shapes.length - 1, 1);
    //   }
    // });

    // window.addEventListener('resize', function(){
    //     let w = $('.applicationBlockDiagramImg').width(),
    //     h = $('.applicationBlockDiagramImg').height()
    //     imgW = $('.applicationBlockDiagramImg img')[0].naturalWidth,
    //     imgH = $('.applicationBlockDiagramImg img')[0].naturalHeight;
    //     cvs.width = w * devicePixelRatio;
    //     cvs.height = h * devicePixelRatio;
    //     ctx.clearRect(0, 0, cvs.width, cvs.height);
    //     cvs.style.width = w + 'px';
    //     cvs.style.height = h + 'px';
    //     let compute = h / w;
    //     let computeW = w / imgW;
    //     let computeH = h / imgH;
    //     let scale = Math.min(w / imgW, h / imgH);
    //     let arrayjson = [];
    //     if(shapes.length > 0){
    //         for(let i = 0; i < shapes.length; i++){
    //             console.log(shapes[i].startX * scale, shapes[i].endX * scale, scale)
    //            let shape = new Rectangle('#f00');
    //            let sX = shapes[i].startX * computeW;
    //            let sY = shapes[i].startY * computeH;
    //            let eX = shapes[i].endX * computeW;
    //            let eY = shapes[i].endY * computeH;
    //            shape.index = i;
    //            shape.startX = sX;
    //            shape.startY = sY;
    //            shape.endX = eX;
    //            shape.endY = eY;
    //            arrayjson.push(shape);
    //         }console.log(arrayjson,'前')
    //         setTimeout(function(){
    //             shapes = arrayjson;
    //             console.log(shapes,'后')
    //         }, 5000);

    //     }
    // });

    // 判断是否有数据
    let data = [];

    if ($('.paintingAreaData').val() !== '') {
      data = JSON.parse($('.paintingAreaData').val());
    }

    if (data.length > 0) {
      // 存储多个矩形的数组
      const rects = [];

      let imgEl = $('.applicationBlockDiagramImg img');
      let img = new Image();
      img.src = imgEl.attr('src');
      img.onload = function () {

        data.forEach(function (item, index) {

          // 计算坐标的变化比例
          let scaleFactor = w / newWidth;

          // 计算在该屏幕尺寸下，框的坐标
          let startX = item.startX * scaleFactor;
          let startY = item.startY * scaleFactor;
          let endX = item.endX * scaleFactor;
          let endY = item.endY * scaleFactor;

          let shape = new Rectangle('#f00', startX, startY, index);
          shape.endX = endX;
          shape.endY = endY;
          shape.product = item.product;

          shapes.push(shape);

          rects.push({ x: startX, y: startY, width: endX - startX, height: endY - startY });

        });

        // 检测鼠标是否在任何一个矩形内
        function isInsideAnyRect (pos, rects) {
          return rects.some(rect => {
            return pos.x >= rect.x && pos.x <= rect.x + rect.width &&
              pos.y >= rect.y && pos.y <= rect.y + rect.height;
          });
        }

        // 鼠标移入框内改为鼠标手
        cvs.addEventListener('mousemove', function (event) {
          // 计算鼠标在canvas上的位置
          const mousePos = {
            x: event.offsetX,
            y: event.offsetY
          };

          if (isInsideAnyRect(mousePos, rects)) {
            cvs.style.cursor = 'pointer';
          } else {
            cvs.style.cursor = 'default';
          }

        });

        // 分类切换
        $('.applicationBlockDiagramClass .list h3').on('click', function () {
          $('.applicationBlockDiagramClass .list .subList a').removeClass('bold');
          if (!$(this).parent().hasClass('active')) {
            $('.applicationBlockDiagramClass .list').removeClass('active');
            $('.applicationBlockDiagramClass .list .subList').slideUp('fast');

            $(this)
              .parent()
              .addClass('active')
              .siblings()
              .removeClass('active');
            $(this).next('.subList').slideDown();
          } else {
            $(this).parent().removeClass('active');
            $(this).next('.subList').slideUp('fast');
          }
        });

        console.log('总数据', data);

        if ($(document).width() > 768) return;

        const filterData = [];
        var dropHtml = '';

        // 渲染移动端点位效果
        data.forEach(function (item, index) {
          var left = (item.startX + item.endX) / 2 / newWidth * 100 + '%';
          var top = (item.startY + item.endY) / 2 / newHeight * 100 + '%';

          filterData.push(item.product);
          dropHtml += `<div class="drop" style="left: ${left};top: ${top};"><span></span><span></span><span></span></div>`;
        });

        $('.applicationBlockDiagramDrops').html(dropHtml);


        function mergeItems (items) {
          // 创建一个映射（Map）来存储合并后的结果  
          const mergedMap = new Map();

          items.forEach(item => {
            // 对每个item的title进行遍历  
            item.title.forEach((title, index) => {
              // 检查这个title是否已经在map中存在  
              if (!mergedMap.has(title)) {
                // 如果不存在，则创建一个新的entry  
                mergedMap.set(title, {
                  title: title,
                  newchi: []
                });
              }

              // 检查newchi中是否有重复的对象  
              const existingEntry = mergedMap.get(title);
              const existingTitleInNewChi = existingEntry.newchi.some(obj => obj.title === item.newchi[index].title);

              if (!existingTitleInNewChi) {
                // 如果不存在重复的对象，则添加到newchi数组中  
                existingEntry.newchi.push(item.newchi[index]);
              }

              // （可选）如果你想在合并后更新value数组（假设每个相同title的value都应相同），则这里可以移除  
              // 因为在这个场景中，value的合并可能不直接适用于所有情况，但可以根据需要进行调整  
            });
          });

          // 将Map转换回数组  
          const mergedItems = [];
          mergedMap.forEach((value, key) => {
            mergedItems.push(value);
          });

          // 返回合并后的数组，但可能需要根据需要调整结构  
          return mergedItems;
        }

        merged = mergeItems(filterData)

        // 渲染分类
        laytpl(classTPL).render(merged, function (str) {
          classView.innerHTML = str;

          // 分类切换
          $('.applicationBlockDiagramClass .list h3').on('click', function () {
            $('.applicationBlockDiagramClass .list .subList a').removeClass('bold');
            if (!$(this).parent().hasClass('active')) {
              $('.applicationBlockDiagramClass .list').removeClass('active');
              $('.applicationBlockDiagramClass .list .subList').slideUp('fast');

              $(this)
                .parent()
                .addClass('active')
                .siblings()
                .removeClass('active');
              $(this).next('.subList').slideDown();
            } else {
              $(this).parent().removeClass('active');
              $(this).next('.subList').slideUp('fast');
            }
          });
        });

      };

    }
  }

  paintingArea();
});
