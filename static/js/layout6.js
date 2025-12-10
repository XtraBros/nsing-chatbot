$(document).ready(function () {
  let scrollTop = 0;

  function onScroll () {
    let newScrollTop = $(document).scrollTop();

    if ($('.entryAnimation').length === 1) {
      if (newScrollTop !== 0) {
        $('.header').addClass('headerBg');
      } else {
        $('.header').removeClass('headerBg');
      }

      // if (scrollTop > newScrollTop) {
      //   $('.header').removeClass('headerUp');
      // } else if (newScrollTop !== 0) {
      //   $('.header').addClass('headerUp');
      // }
    }

    if ($(document).width() < 992) {
      if (newScrollTop !== 0) {
        $('.mobileHeader').addClass('mobileHeaderBg');
      } else {
        if ($('.entryAnimation').length === 0) return;
        $('.mobileHeader').removeClass('mobileHeaderBg');
      }
    };

    scrollTop = newScrollTop;
  }

  $(window).on('resize', onScroll);
  $(window).on('scroll', onScroll);

  if ($('.entryAnimation').length === 0) {
    $('.header').addClass('headerBg');
    $('.mobileHeader').addClass('mobileHeaderBg');
  }

  // 头部
  $('.menusBtn').on('click', function () {
    if (!$(this).hasClass('active')) {
      $(this).addClass('active');
      $('body').addClass('leftOffset');
      $('.mobileHeader').addClass('leftOffset');
      $('html').addClass('stopScroll');
    } else {
      $(this).removeClass('active');
      $('body').removeClass('leftOffset');
      $('.mobileHeader').removeClass('leftOffset');
      $('html').removeClass('stopScroll');
    }
  });

  $('.langBtn').on('click', function () {
    $(this).find('.popup').toggle();
  });

  $('.banner .swiper-wrapper .swiper-slide .image video').each(function (
    index,
    item,
  ) {
    const pcSrc = $(item).attr('data-pcsrc');
    const mobileSrc = $(item).attr('data-mobilesrc');
    const pcPoster = $(item).attr('data-pcposter');
    const mobilePoster = $(item).attr('data-mobileposter');

    if ($(item).attr('data-switch') == 1) {
      $(item).on('contextmenu', function (e) {
        e.preventDefault();
      });
    }

    if ($(document).width() > 768) {
      $(item).attr({
        src: pcSrc,
        poster: pcPoster,
      });
    } else {
      $(item).attr({
        src: mobileSrc,
        poster: mobilePoster,
      });
    }
  });

  // 入场动画
  function entryAnimation () {
    let findex = 0;
    let fileImg = [];

    if ($('.entryAnimation').length > 0) {
      $('html').addClass('stopScroll');

      // $('.banner .swiper-wrapper .swiper-slide video').each(function () {
      //   fileImg.push($(this).attr('poster'));
      // });

      fileImg.push($('.entryAnimation .logo img').attr('src'));

      let imgBg = new Image();
      imgBg.src = $('.entryAnimation .logo img').attr('src');

      function loadImg (findex) {
        let img = new Image();
        img.src = fileImg[findex];

        img.onload = function () {
          findex++;
          let percent = Math.round((findex / fileImg.length) * 100);
          $('.entryAnimation .logo .mask').animate({ width: percent + '%' }, 10);

          if (findex < fileImg.length) {
            loadImg(findex);
          } else {
            $('.entryAnimation .logo .mask').animate({ width: '100%' }, 10);

            setTimeout(function () {
              $('.entryAnimation').addClass('active');
              $('html').removeClass('stopScroll');
            }, 1000);
          }
        };
      }

      imgBg.onload = function () {
        loadImg(findex);
      };
    }
  }

  entryAnimation();

  // 头部
  $('.headerSearch .select .optionActive').on('click', function () {
    if ($(this).next().is(':hidden')) {
      $(this).next().slideDown();
    } else {
      $(this).next().slideUp('fast');
    }
  });

  $('.headerSearch .select .optionMain .option').on('click', function () {
    let type = $(this).attr('data-type');
    let iconUrl = $(this).find('.icon img').attr('src');

    $(this).addClass('active').siblings().removeClass('active');
    $(this)
      .parent()
      .parent()
      .find('.optionActive .icon img')
      .attr('src', iconUrl);
    $(this).parents('.headerSearch').find('.input').attr('data-type', type);
    $(this).parent().slideUp('fast');
  });

  if ($(document).width() > 768) {
    var activeIndex = $('.headerNav ul li.active').index();

    // 下拉菜单
    $('.headerNav ul li').on('click', function () {
      $('.header').removeClass('headerTrans').addClass('headerBg');
      if ($(this).find('.dropDownMenu').length !== 0) {
        $('html').addClass('stopScroll');

        $(this).addClass('active').siblings().removeClass('active');
        $('.maskLayer').stop().fadeIn('fast');
        $('.dropDownMenu').hide();
        $(this).find('.dropDownMenu').show();
      }

      if ($('.banner').length > 0 && $(document).scrollTop() !== 0) {
        $('.header').addClass('headerBg');
      }

      $('.dropDownMenuClose').on('click', function (e) {
        e.stopPropagation();

        $('html').removeClass('stopScroll');
        $('.headerNav ul li').eq(activeIndex).addClass('active').siblings().removeClass('active');
        $('.maskLayer').hide();
        $('.dropDownMenu').hide();
      });
    });

    $('.maskLayer').on('click', function () {
      $('html').removeClass('stopScroll');
      $('.headerNav ul li').eq(activeIndex).addClass('active').siblings().removeClass('active');
      $(this).hide();
      $('.dropDownMenu').hide();
    });
  }

  // 数字滚动
  $('.counter').countUp({
    delay: 10,
    time: 2500,
  });

  // 面包屑导航
  if ($(document).width() > 768) {
    var headerHeight = $('.header').height();
    var listHeight = $('.detailList').height();

    function breadcrumbNavChange () {
      if ($('.detailListBg').length > 0) {
        var top = headerHeight + listHeight;
        $('.locationBg').css('top', top + 'px').attr('data-top', top);
        $('.breadcrumbNavBg').css('top', top + 'px').attr('data-top', top);
      } else {
        var top = headerHeight;
        $('.locationBg').css('top', top + 'px').attr('data-top', top);
        $('.breadcrumbNavBg').css('top', top + 'px').attr('data-top', top);

        $('.screenList2Bg').css('top', headerHeight + $('.locationBg').height() + 'px').attr('data-top', headerHeight + $('.locationBg').height());
        $('.screenListBg').css('top', headerHeight + $('.locationBg').height() + 'px').attr('data-top', headerHeight + $('.locationBg').height());

      }
    }

    breadcrumbNavChange();
    $(window).resize(breadcrumbNavChange());

    $(window).on('scroll', function () {
      if ($('.breadcrumbNavBg').length > 0) {
        if (scrollTop >= $('.breadcrumbNavBg').attr('data-top')) {
          $('.breadcrumbNavBg').addClass('fixed');
        } else {
          $('.breadcrumbNavBg').removeClass('fixed');
        }
      } else {
        if (scrollTop >= $('.screenList2Bg').attr('data-top')) {
          $('.screenList2Bg').addClass('fixed');
        } else {
          $('.screenList2Bg').removeClass('fixed');
        }

        if (scrollTop >= $('.screenListBg').attr('data-top')) {
          $('.screenListBg').addClass('fixed');
        } else {
          $('.screenListBg').removeClass('fixed');
        }
      }

    });
  }

  // 内页分类
  if ($('.oneLevel.active').length !== 0) {
    $('.oneLevel.active .oneLevelMain').slideDown('fast');
  }

  if ($('.secondLevelTitle.active').length !== 0) {
    $('.secondLevelTitle.active').next('.secondLevelMain').slideDown('fast');
  }

  $('.oneLevelTitle .icon').on('click', function () {
    $('.oneLevelMain').slideUp('fast');
    $('.oneLevel').removeClass('active');
    if ($(this).parent().next('.oneLevelMain').is(':hidden')) {
      $(this).parents('.oneLevel').addClass('active');
      $(this).parent().next('.oneLevelMain').slideDown();
    } else {
      $(this).parents('.oneLevel').removeClass('active');
      $(this).parent().next('.oneLevelMain').slideUp('fast');
    }
  });

  $('.secondLevelTitle .icon').on('click', function () {
    $('.secondLevelMain').slideUp('fast');
    $('.secondLevelTitle').removeClass('active');
    if ($(this).parent().next('.secondLevelMain').is(':hidden')) {
      $(this).parent().addClass('active');
      $(this).parent().next('.secondLevelMain').slideDown();
    } else {
      $(this).parent().removeClass('active');
      $(this).parent().next('.secondLevelMain').slideUp('fast');
    }
  });

  $(window).on('scroll', function () {
    $('.detailModule').each(function (index, item) {
      if (
        scrollTop >=
        Math.round(
          $(item).offset().top -
          $('.header').outerHeight() -
          $('.detailListBg').outerHeight() - $('.breadcrumbNavBg').outerHeight(),
        )
      ) {
        $('.detailListNav ul li')
          .eq(index)
          .addClass('active')
          .siblings()
          .removeClass('active');
      }
    });
  });

  $('.detailListNav ul li').on('click', function () {
    $('html,body')
      .stop()
      .animate(
        {
          scrollTop: Math.round(
            $('.detailModule').eq($(this).index()).offset().top -
            $('.header').outerHeight() -
            $('.detailListBg').outerHeight() - $('.breadcrumbNavBg').outerHeight(),
          ),
        },
        900,
      );
    // $(this).addClass('active').siblings().removeClass('active');
  });

  if ($('.detailListNav ul li').length > 5) {
    $('.detailListNav').addClass('margin');
  }

  if ($(document).width() < 768) {
    if ($('.secondLevelMain .threeLevel.active').length > 0) {
      $('html,body')
        .stop()
        .animate(
          {
            scrollTop: $('.secondLevelMain .threeLevel.active').offset().top - $('.header').height() * 3
          },
          900,
        );
    }
  }

  // 计算矩阵图列表y轴高度
  $('.productsMatrixDiagramMain .wrapper').each(function (index, item) {
    $('.productsMatrixDiagramParam .param')
      .eq(index)
      .css('height', $(item).height());
  });

  $('.productsMatrixDiagram2Main .wrapper').each(function (index, item) {
    $('.productsMatrixDiagram2Param .param')
      .eq(index)
      .css('height', $(item).height());
  });

  $('.productsMatrixDiagram3Main .wrapper').each(function (index, item) {
    $('.productsMatrixDiagram3Param .param')
      .eq(index)
      .css('height', $(item).height());
  });

  // 计算矩阵图列表x轴宽度
  $('.productsMatrixDiagramMain .wrapper .products ul li').each(function (
    index,
    item,
  ) {
    $('.productsMatrixDiagramMain .wrapper .params ul li')
      .eq(index)
      .css('width', $(item).width());
  });

  $('.productsMatrixDiagram2Main .wrapper .products ul li').each(function (
    index,
    item,
  ) {
    $('.productsMatrixDiagram2Main .wrapper .params ul li')
      .eq(index)
      .css('width', $(item).width());
  });

  $('.productsMatrixDiagram3Main .wrapper .products ul li').each(function (
    index,
    item,
  ) {
    $('.productsMatrixDiagram3Main .wrapper .params ul li')
      .eq(index)
      .css('width', $(item).width());
  });

  if ($('.productsMatrixDiagram2Main .wrapper .products ul li').length > 3) {
    $('.productsMatrixDiagram2').addClass('several');
  }

  if ($('.productsMatrixDiagramMain .wrapper .products ul li').length > 3) {
    $('.productsMatrixDiagram').addClass('several');
  }

  $('.locateusAddress ul li .content .more').on('click', function () {
    if (!$(this).parents('li').hasClass('active')) {
      $('.locateusAddress ul li .map').slideUp();
      $(this).parents('li').find('.map').slideDown();
      $(this).parents('li').addClass('active').siblings().removeClass('active');
    } else {
      $(this).parents('li').find('.map').slideUp();
      $(this).parents('li').removeClass('active');
    }
  });

  $('.locateusLeft .drops .drop').each(function (index, item) {
    const top = $(item).attr('data-top');
    const left = $(item).attr('data-left');
    const width = 969, height = 605;

    $(item).css({
      top: top / height * 100 + '%',
      left: left / width * 100 + '%'
    });
  });

  $('.locateus .locateusAddress ul li .map .drop').each(function (index, item) {
    const top = $(item).attr('data-top');
    const left = $(item).attr('data-left');
    const width = 1920, height = 641;

    $(item).css({
      top: top / height * 100 + '%',
      left: left / width * 100 + '%'
    });
  });

  // wow
  if (typeof WOW !== undefined) {
    let wow = new WOW({
      boxClass: 'wow',
      animateClass: 'animated',
      offset: 50,
      mobile: true,
      live: true,
    });
    wow.init();
  }

  // swiper
  if (typeof Swiper !== undefined) {
    new Swiper('.banner', {
      loop: true,
      speed: 1200,
      autoplay: {
        delay: 4500,
        pauseOnMouseEnter: true
      },
      pagination: {
        el: '.banner .swiper-pagination',
        clickable: true,
      },
    });

    new Swiper('.indexProductsMain', {
      speed: 900,
      breakpoints: {
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 4,
        }
      },
      navigation: {
        nextEl: '.indexProductsMain .swiper-button-next',
        prevEl: '.indexProductsMain .swiper-button-prev',
      },
      pagination: {
        el: '.indexProductsMain .swiper-pagination',
        clickable: true,
      },
    });

    const indexSolutionsMain = new Swiper('.indexSolutionsMain', {
      loop: true,
      speed: 900,
      autoplay: {
        daley: 4500,
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 4,
          spaceBetween: 20,
        }
      },
      pagination: {
        el: '.indexSolutionsOther .swiper-pagination',
        type: 'custom',
        renderCustom: function (swiper, current, total) {
          if (current < 10) current = '0' + current;
          if (total < 10) total = '0' + total;

          return `<div class="swiper-pagination-current">${current}</div><div class="progressBar active"></div><div class="swiper-pagination-total">${total}</div>`;
        },
      },
      navigation: {
        nextEl: '.indexSolutionsOther .swiper-button-next',
        prevEl: '.indexSolutionsOther .swiper-button-prev',
      },
    });

    $('.indexSolutionsOther .icon .stop').on('click', function () {
      $(this).hide();
      $('.indexSolutionsOther .icon .play').show();
      indexSolutionsMain.autoplay.stop();
      $('.progressBar').removeClass('active');
    });

    $('.indexSolutionsOther .icon .play').on('click', function () {
      $(this).hide();
      $('.indexSolutionsOther .icon .stop').show();
      indexSolutionsMain.autoplay.start();
      $('.progressBar').addClass('active');
    });

    new Swiper('.indexNewsLeft', {
      speed: 900,
      autoplay: {
        delay: 3500
      },
      pagination: {
        el: '.indexNewsLeft .swiper-pagination',
        clickable: true,
      },
    });

    new Swiper('.indexNewsRight', {
      speed: 900,
      pagination: {
        el: '.indexNewsRight .swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        0: {
          direction: 'horizontal',
          slidesPerView: 1,
          spaceBetween: 15,
          mousewheel: false,
        },
        768: {
          direction: 'vertical',
          slidesPerView: 'auto',
          spaceBetween: 10,
          mousewheel: true,
        }
      },
    });

    var slidesPerView = 3

    if ($(document).width() > 768) {
      if ($('.typicalApplicationsMain .swiper-wrapper .swiper-slide').length == 1) {
        slidesPerView = 1;
      }

      if ($('.typicalApplicationsMain .swiper-wrapper .swiper-slide').length == 2) {
        slidesPerView = 2;
      }
    }

    new Swiper('.typicalApplicationsMain', {
      loop: true,
      speed: 900,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: slidesPerView,
          spaceBetween: 30,
        }
      },
      navigation: {
        nextEl: '.typicalApplicationsTitle .swiper-button-next',
        prevEl: '.typicalApplicationsTitle .swiper-button-prev',
      },
      pagination: {
        el: '.typicalApplicationsMain .swiper-pagination',
        clickable: true,
      },
    });

    new Swiper('.productionToolMain', {
      speed: 900,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 32,
        }
      },
      navigation: {
        nextEl: '.productionToolTitle .swiper-button-next',
        prevEl: '.productionToolTitle .swiper-button-prev',
      },
      pagination: {
        el: '.productionToolMain .swiper-pagination',
        clickable: true,
      },
    });

    new Swiper('.trainingCoursewareMain', {
      speed: 900,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 3,
          spaceBetween: 20,
        }
      },
      navigation: {
        nextEl: '.trainingCoursewareTitle .swiper-button-next',
        prevEl: '.trainingCoursewareTitle .swiper-button-prev',
      },
      pagination: {
        el: '.trainingCoursewareMain .swiper-pagination',
        clickable: true,
      },
    });

    new Swiper('.events', {
      speed: 900,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 0,
        }
      },
      pagination: {
        el: '.events .swiper-pagination',
        clickable: true,
        // dynamicBullets: true,
      },
      on: {
        init: function () {
          let current = this.activeIndex + 1;
          let total = $('.events .swiper-pagination .swiper-pagination-bullet').length;

          if ($('.events .swiper-wrapper .swiper-slide').length == 1) return $('.events .pagination').hide();

          if (current < 10) current = '0' + current;
          if (total < 10) total = '0' + total;

          $('.events .pagination .current').text(current);
          $('.events .pagination .total').text(total);
        },
        slideChange: function () {
          let current = this.activeIndex + 1;
          let total = $('.events .swiper-pagination .swiper-pagination-bullet').length;

          if (current < 10) current = '0' + current;
          if (total < 10) total = '0' + total;

          $('.events .pagination .current').text(current);
          $('.events .pagination .total').text(total);
        }
      }
    });

    new Swiper('.distinguishedGuestMain', {
      // effect: 'fade',
      speed: 1200,
      breakpoints: {
        0: {
          spaceBetween: 15,
        },
        768: {
          spaceBetween: 30,
        }
      },
      autoHeight: true,
      navigation: {
        nextEl: '.distinguishedGuestTitle .btns .swiper-button-next',
        prevEl: '.distinguishedGuestTitle .btns .swiper-button-prev',
      },
      pagination: {
        el: '.distinguishedGuestMain .swiper-pagination',
        clickable: true,
      },
    });

    new Swiper('.videoMain', {
      // effect: 'fade',
      speed: 1200,
      spaceBetween: 30,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 30,
        }
      },
      navigation: {
        nextEl: '.videoTitle .btns .swiper-button-next',
        prevEl: '.videoTitle .btns .swiper-button-prev',
      },
      pagination: {
        el: '.videoMain .swiper-pagination',
        clickable: true,
      },
    });

    new Swiper('.newsRoomMain', {
      speed: 900,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 0,
        }
      },
      pagination: {
        el: '.newsRoomMain .swiper-pagination',
        clickable: true,
        // dynamicBullets: true,
      },
      on: {
        init: function () {
          let current = this.activeIndex + 1;
          let total = $('.newsRoomMain .swiper-pagination .swiper-pagination-bullet').length;

          if ($('.newsRoomMain .swiper-wrapper .swiper-slide').length == 1) return $('.newsRoomMain .pagination').hide();

          if (current < 10) current = '0' + current;
          if (total < 10) total = '0' + total;

          $('.newsRoomMain .pagination .current').text(current);
          $('.newsRoomMain .pagination .total').text(total);
        },
        slideChange: function () {
          let current = this.activeIndex + 1;
          let total = $('.newsRoomMain .swiper-pagination .swiper-pagination-bullet').length;

          if (current < 10) current = '0' + current;
          if (total < 10) total = '0' + total;

          $('.newsRoomMain .pagination .current').text(current);
          $('.newsRoomMain .pagination .total').text(total);
        }
      }
    });

    const historyList = new Swiper('.historyList', {
      speed: 900,
      watchSlidesVisibility: true,
      breakpoints: {
        0: {
          slidesPerView: 5,
        },
        768: {
          slidesPerView: 8,
        }
      },
    });

    new Swiper('.historyMain', {
      // effect: 'fade',
      speed: 1200,
      spaceBetween: 30,
      autoplay: {
        delay: 4000,
      },
      navigation: {
        nextEl: '.historyMain .swiper-button-next',
        prevEl: '.historyMain .swiper-button-prev',
      },
      thumbs: {
        swiper: historyList,
      },
    });

    // if ($(document).width() < 768) {
    //   new Swiper('.coreCompetitiveAdvantageMain', {
    //     speed: 1200,
    //     autoplay: {
    //       delay: 4000,
    //     },
    //     breakpoints: {
    //       0: {
    //         spaceBetween: 15,
    //         pagination: {
    //           el: '.coreCompetitiveAdvantageMain .swiper-pagination',
    //           clickable: true,
    //         },
    //       },
    //       768: {
    //         spaceBetween: 0,
    //         pagination: {
    //           el: '.coreCompetitiveAdvantageMain .swiper-pagination',
    //           type: 'custom',
    //           renderCustom: function (swiper, current, total) {
    //             if (current < 10) current = '0' + current;
    //             if (total < 10) total = '0' + total;

    //             return `<div class="current">${current}</div><div class="line"></div><div class="total">${total}</div>`;
    //           },
    //         },
    //       }
    //     },
    //   });
    // }

    const endorsementImages = new Swiper('.endorsementImages', {
      speed: 900,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 34,
        }
      },
      navigation: {
        nextEl: '.endorsement .swiper-button-next',
        prevEl: '.endorsement .swiper-button-prev',
      },
    });

    const endorsementContent = new Swiper('.endorsementContent', {
      speed: 2000,
      spaceBetween: 30,
      autoHeight: true,
      pagination: {
        el: '.endorsementContent .swiper-pagination',
        clickable: true,
      },
      controller: {
        control: endorsementImages,
      }
    });

    endorsementImages.controller.control = endorsementContent;
    endorsementContent.controller.control = endorsementImages;

    if ($('.endorsementContent').length > 0) {
      endorsementContent.slideTo(2, 0, false);
    }

    new Swiper('.productsNews', {
      speed: 1200,
      autoHeight: true,
      autoplay: {
        delay: $('.productsNews').attr('data-time')
      },
      pagination: {
        el: '.productsNews .swiper-pagination',
        clickable: true,
      },
    });

  }


  $(function () {
    if ($('.headTrans').val() == 0) {
      $('.header').addClass('headerTrans');
    }
    onScroll();
    $(window).scroll(onScroll);

    function onScroll () {
      var p = $(window).scrollTop();
      if (p > 20) {
        $('.header').removeClass('headerTrans');
        $('.locationBg').addClass('fixed');

        if ($('.productsDetail').length > 0) $('.breadcrumbNavBg').addClass('fixed');
      } else {
        $('.header').addClass('headerTrans');
        $('.locationBg').removeClass('fixed');

        if ($('.productsDetail').length > 0) $('.breadcrumbNavBg').removeClass('fixed');
      }
    }

    $('.consumerClass .list h3').on('click', function () {
      if ($(this).next().is(':hidden')) {
        $(this).next().slideDown(300);
        $(this).parent().addClass('active');
      } else {
        $(this).next().slideUp(300);
        $(this).parent().removeClass('active');
      }
    });

  });
});

// 搜索特效
$('.searchAllInput input').on('focus', function () {
  $(this).parent().addClass('focus');
});

$('.searchAllInput input').on('blur', function () {
  $(this).parent().removeClass('focus');
});

$('.crossSearchBox input').on('focus', function () {
  $(this).parent().addClass('focus');
});

$('.crossSearchBox input').on('blur', function () {
  $(this).parent().removeClass('focus');
});

$('.selectionToolsSearch input').on('focus', function () {
  $(this).parent().addClass('focus');
});

$('.selectionToolsSearch input').on('blur', function () {
  $(this).parent().removeClass('focus');
});

$('.downloadCenterTitleRight input').on('focus', function () {
  $(this).parent().addClass('focus');
});

$('.downloadCenterTitleRight input').on('blur', function () {
  $(this).parent().removeClass('focus');
});

$('.basicInformationFormMain .wrapper .input input').on('focus', function () {
  $(this).parent().addClass('focus');
});

$('.basicInformationFormMain .wrapper .input input').on('blur', function () {
  $(this).parent().removeClass('focus');
});

$('.agentFormInquiry .input .inputMain input').on('focus', function () {
  $(this).parent().addClass('focus');
});

$('.agentFormInquiry .input .inputMain input').on('blur', function () {
  $(this).parent().removeClass('focus');
});

$('.registerNowPopup input').on('focus', function () {
  $(this).parent().addClass('focus');
});

$('.registerNowPopup input').on('blur', function () {
  $(this).parent().removeClass('focus');
});

$('.technicalResourcesMain ul li .pdf a').each(function (index, item) {
  var scrollHeight = $(item).find('.illustrate span')[0].scrollHeight;
  var clientHeight = $(item).find('.illustrate span')[0].clientHeight;

  console.log(scrollHeight, clientHeight);

  if (scrollHeight > clientHeight) {
    $(item).find('.more').show();
  }
});

$('.technicalResourcesMain ul li .pdf a .more').on('click', function (e) {
  e.preventDefault();

  $(this).hide();
  $(this).prev().css('-webkit-line-clamp', 'unset');
});