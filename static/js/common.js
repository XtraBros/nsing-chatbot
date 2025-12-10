$(function(){
    if($('.headTrans').val() == 0){
        $('.header').addClass('headerTrans');
    }
    onScroll();
    $(window).scroll(onScroll);

    function onScroll(){
        p = $(window).scrollTop();
        if(p > 20){
            $('.header').removeClass('headerTrans');
        } else {
            $('.header').addClass('headerTrans');
        }
    }

    $('.consumerClass .list h3').on('click', function(){
        if($(this).next().is(':hidden')){
            $(this).next().slideDown(300);
            $(this).parent().addClass('active');
        } else {
            $(this).next().slideUp(300);
            $(this).parent().removeClass('active');
        }
    });

});