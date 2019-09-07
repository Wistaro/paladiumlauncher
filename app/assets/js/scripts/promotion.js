/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

initSlide();

var instanceLauncherHomeSlider;
function initSlide() {
    $(".home-slider").hide();

    var sliderInner = $(".home-slider");
    var childrenNo = sliderInner.children().length-1;
    var index = 0;

    function setActive(value) {
        var slideOld = $(".home-slider .active");
        slideOld.removeClass("active");
        slideOld.fadeOut(1000);

        var video = slideOld.children("video").get(0);
        if(video != null) {
            video.currentTime = 0;
            video.pause();
        }
        
        var slideActive = $(".home-slide").eq(value);
        slideActive.addClass("active");
        slideActive.fadeIn(1000);

        video = slideActive.children("video").get(0);

        if(video != null) {
            video.play();
            
            instanceLauncherHomeSlider = setTimeout(function() {
                video.currentTime = 0;
                video.pause();
                autoSlide();
            }, video.duration*1000);
        }
        else {
            instanceLauncherHomeSlider = setTimeout(function() {
                autoSlide();
            }, 8000);
        }
    }

    function autoSlide() {
        index++;
        if(index >= childrenNo) {
            index = 0;
        }
        setActive(index);
    }

    instanceLauncherHomeSlider = setTimeout(function() {
        $(".home-slider").fadeIn(1000);
        setActive(0);
    }, 1000);
}