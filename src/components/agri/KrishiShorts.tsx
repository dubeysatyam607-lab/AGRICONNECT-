import React, { useState, useRef } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Heart, Share2, Phone, ChevronUp, ChevronDown, Leaf, User, Eye, Play, X, ExternalLink } from "lucide-react";

interface VideoShort {
  id: number;
  title: string;
  titleHi: string;
  creator: string;
  channel: string;
  views: string;
  likes: number;
  cropTag: string;
  thumbnail: string;
  youtubeId: string;
  description: string;
  descriptionHi: string;
}

// Government & official agricultural YouTube videos (ICAR, KVK, DD Kisan, etc.)
const SHORTS_DATA: VideoShort[] = [
  {
    id: 1,
    title: 'Organic Farming Techniques - ICAR',
    titleHi: 'जैविक खेती की तकनीक - ICAR',
    creator: 'ICAR - Indian Council',
    channel: 'ICAR Official',
    views: '2.1M',
    likes: 45200,
    cropTag: 'Organic',
    thumbnail: 'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'V3gL5OUUvgY',
    description: 'Learn proven organic farming techniques recommended by ICAR scientists for better yield and soil health.',
    descriptionHi: 'ICAR वैज्ञानिकों द्वारा अनुशंसित जैविक खेती तकनीक सीखें।',
  },
  {
    id: 2,
    title: 'Wheat Cultivation Guide - KVK',
    titleHi: 'गेहूं की खेती की पूरी गाइड - KVK',
    creator: 'KVK Rajasthan',
    channel: 'DD Kisan',
    views: '890K',
    likes: 18700,
    cropTag: 'Wheat',
    thumbnail: 'https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'Z0L-bSmNRuI',
    description: 'Complete wheat cultivation guide from seed selection to harvest by Krishi Vigyan Kendra experts.',
    descriptionHi: 'KVK विशेषज्ञों द्वारा गेहूं की खेती की पूरी जानकारी।',
  },
  {
    id: 3,
    title: 'Drip Irrigation & Water Management',
    titleHi: 'ड्रिप सिंचाई और जल प्रबंधन',
    creator: 'NWRMC Ministry',
    channel: 'Ministry of Agri',
    views: '3.4M',
    likes: 72100,
    cropTag: 'All Crops',
    thumbnail: 'https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'XJJL7M9DBm4',
    description: 'Government tutorial on setting up drip irrigation under PM Krishi Sinchai Yojana for 40% water savings.',
    descriptionHi: 'PM सिंचाई योजना के तहत ड्रिप सिंचाई लगाने की जानकारी।',
  },
  {
    id: 4,
    title: 'Soil Health Card - How to Read & Use',
    titleHi: 'मिट्टी स्वास्थ्य कार्ड - कैसे पढ़ें और उपयोग करें',
    creator: 'Dept. of Agriculture',
    channel: 'Kisan Sampark',
    views: '1.7M',
    likes: 34600,
    cropTag: 'Soil',
    thumbnail: 'https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'BNDgzOvRBeI',
    description: 'Government guidance on reading your Soil Health Card and applying the right fertilizers for your land.',
    descriptionHi: 'सरकार की ओर से मिट्टी स्वास्थ्य कार्ड पढ़ने और सही खाद डालने की जानकारी।',
  },
  {
    id: 5,
    title: 'PM-KISAN Scheme - Registration & Benefits',
    titleHi: 'PM-किसान योजना - पंजीकरण और लाभ',
    creator: 'Ministry of Agriculture',
    channel: 'MoA&FW India',
    views: '5.2M',
    likes: 98300,
    cropTag: 'Schemes',
    thumbnail: 'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'rF3GJnmGMI0',
    description: 'Official guide to register for PM-KISAN and receive ₹6000/year direct benefit transfer to your bank.',
    descriptionHi: 'PM-किसान में पंजीकरण करके ₹6000 सालाना सीधे बैंक में पाएं।',
  },
  {
    id: 6,
    title: 'Pest & Disease Management - Tomato',
    titleHi: 'कीट और रोग प्रबंधन - टमाटर',
    creator: 'ICAR-IARI',
    channel: 'ICAR IARI',
    views: '670K',
    likes: 15200,
    cropTag: 'Tomato',
    thumbnail: 'https://images.pexels.com/photos/5685910/pexels-photo-5685910.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'gAj55V-9rjk',
    description: 'IARI scientists explain how to identify and control common tomato pests using integrated pest management.',
    descriptionHi: 'IARI वैज्ञानिक टमाटर के कीटों की पहचान और नियंत्रण के बारे में बताते हैं।',
  },
  {
    id: 7,
    title: 'Natural Farming - Zero Budget',
    titleHi: 'प्राकृतिक खेती - शून्य बजट',
    creator: 'DD Kisan',
    channel: 'DD Kisan Channel',
    views: '4.8M',
    likes: 112000,
    cropTag: 'Natural',
    thumbnail: 'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'hY7m5jjreZY',
    description: 'Learn Zero Budget Natural Farming (ZBNF) techniques promoted by government to reduce input costs.',
    descriptionHi: 'सरकार द्वारा प्रोत्साहित शून्य बजट प्राकृतिक खेती तकनीक सीखें।',
  },
  {
    id: 8,
    title: 'Kisan Credit Card - Apply & Benefits',
    titleHi: 'किसान क्रेडिट कार्ड - आवेदन और लाभ',
    creator: 'NABARD India',
    channel: 'NABARD Official',
    views: '2.9M',
    likes: 56800,
    cropTag: 'Finance',
    thumbnail: 'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    youtubeId: 'k1G7Zd1ALHY',
    description: 'NABARD explains how to apply for Kisan Credit Card and get loans at 4% interest rate for farming needs.',
    descriptionHi: 'NABARD बताता है कि KCC के लिए कैसे आवेदन करें और 4% ब्याज पर ऋण पाएं।',
  },
];

interface KrishiShortsProps {
  onToast: (message: string) => void;
  onClose?: () => void;
}

const KrishiShorts: React.FC<KrishiShortsProps> = ({ onToast, onClose }) => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const handleTouchStart = useRef<number>(0);

  const currentVideo = SHORTS_DATA[currentIndex];

  const handleNext = () => {
    if (currentIndex < SHORTS_DATA.length - 1) {
      setPlayingVideoId(null);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setPlayingVideoId(null);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleLike = () => {
    const newLiked = new Set(likedVideos);
    if (likedVideos.has(currentVideo.id)) {
      newLiked.delete(currentVideo.id);
    } else {
      newLiked.add(currentVideo.id);
      onToast('Added to liked videos!');
    }
    setLikedVideos(newLiked);
  };

  const handleShare = () => {
    const shareText = `🌾 Farming tip: ${currentVideo.title}\nWatch: https://youtu.be/${currentVideo.youtubeId}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    onToast('Opening WhatsApp to share...');
  };

  const handleCallExpert = () => {
    onToast('Connecting to Kisan Call Center: 1800-180-1551');
    window.location.href = 'tel:18001801551';
  };

  const handleWatchOnYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${currentVideo.youtubeId}`, '_blank', 'noopener,noreferrer');
    onToast('Opening YouTube...');
  };

  const handlePlayVideo = () => {
    setPlayingVideoId(currentVideo.youtubeId);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = handleTouchStart.current - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onTouchStart={(e) => { handleTouchStart.current = e.touches[0].clientY; }}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close Button */}
      <button
        onClick={() => onClose ? onClose() : window.history.back()}
        className="absolute top-4 left-4 z-30 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
      >
        <X size={20} className="text-white" />
      </button>

      {/* Header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
          <Leaf size={14} className="text-primary" />
          <span className="text-white text-sm font-bold">{t('agr101')}</span>
        </div>
      </div>

      {/* Video / Thumbnail Area */}
      <div className="relative flex-1 overflow-hidden">
        {playingVideoId ? (
          /* YouTube Embedded Player */
          <iframe
            key={playingVideoId}
            src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&rel=0&modestbranding=1`}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            title={currentVideo.title}
          />
        ) : (
          <>
            {/* Thumbnail Background */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${currentVideo.thumbnail})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
            </div>

            {/* Channel Badge */}
            <div className="absolute top-14 left-4 z-20">
              <div className="flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full">
                <div className="w-4 h-3 bg-white rounded-sm flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-red-600 border-y-[4px] border-y-transparent" />
                </div>
                <span className="text-white text-xs font-bold">{currentVideo.channel}</span>
              </div>
            </div>

            {/* Big Play Button */}
            <button
              onClick={handlePlayVideo}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/40 hover:bg-white/30 transition-colors">
                <Play size={36} className="text-white ml-2" fill="white" />
              </div>
            </button>

            {/* Progress Dots */}
            <div className="absolute top-14 right-4 flex flex-col gap-1 z-20">
              {SHORTS_DATA.map((_, index) => (
                <button
                  key={index}
                  onClick={() => { setCurrentIndex(index); setPlayingVideoId(null); }}
                  className={`rounded-full transition-all ${
                    index === currentIndex ? 'w-2 h-6 bg-white' : 'w-2 h-2 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Right Side Actions (always visible) */}
        {!playingVideoId && (
          <div className="absolute right-4 bottom-36 flex flex-col items-center gap-5 z-20">
            <button onClick={handleLike} aria-label={likedVideos.has(currentVideo.id) ? 'Unlike video' : 'Like video'} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                likedVideos.has(currentVideo.id) ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'
              }`}>
                <Heart
                  size={22}
                  className="text-white"
                  fill={likedVideos.has(currentVideo.id) ? 'white' : 'none'}
                />
              </div>
              <span className="text-white text-xs mt-1 font-medium">
                {(currentVideo.likes + (likedVideos.has(currentVideo.id) ? 1 : 0)).toLocaleString('en-IN')}
              </span>
            </button>

            <button onClick={handleShare} aria-label="Share video on WhatsApp" className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Share2 size={22} className="text-white" />
              </div>
              <span className="text-white text-xs mt-1">{t('agr102')}</span>
            </button>

            <button onClick={handleCallExpert} aria-label="Call Kisan expert helpline" className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Phone size={22} className="text-white" />
              </div>
              <span className="text-white text-xs mt-1">{t('agr103')}</span>
            </button>

            <button onClick={handleWatchOnYouTube} aria-label="Watch video on YouTube" className="flex flex-col items-center">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <ExternalLink size={22} className="text-white" />
              </div>
              <span className="text-white text-xs mt-1">{t('agr104')}</span>
            </button>
          </div>
        )}

        {/* Bottom Info */}
        {!playingVideoId && (
          <div className="absolute bottom-0 left-0 right-16 p-4 z-20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{currentVideo.creator}</p>
                <p className="text-white/70 text-xs flex items-center gap-1">
                  <Eye size={11} /> {currentVideo.views} views
                </p>
              </div>
            </div>

            <h3 className="text-white font-bold text-base mb-1 leading-tight">{currentVideo.title}</h3>
            <p className="text-white/75 text-xs mb-3 line-clamp-2">{currentVideo.description}</p>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1 bg-primary/80 px-2.5 py-1 rounded-full">
                <Leaf size={12} className="text-white" />
                <span className="text-white text-xs font-medium">{currentVideo.cropTag}</span>
              </div>
              <button
                onClick={handlePlayVideo}
                className="inline-flex items-center gap-1 bg-red-600/90 px-3 py-1 rounded-full"
              >
                <Play size={12} className="text-white" fill="white" />
                <span className="text-white text-xs font-medium">{t('agr105')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Arrows */}
        {!playingVideoId && (
          <div className="absolute left-4 bottom-1/2 translate-y-1/2 flex flex-col gap-3 z-20">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                currentIndex === 0 ? 'bg-white/10 opacity-40' : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
              }`}
            >
              <ChevronUp className="text-white" size={22} />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === SHORTS_DATA.length - 1}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                currentIndex === SHORTS_DATA.length - 1 ? 'bg-white/10 opacity-40' : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
              }`}
            >
              <ChevronDown className="text-white" size={22} />
            </button>
          </div>
        )}

        {/* Stop playing button */}
        {playingVideoId && (
          <button
            onClick={() => setPlayingVideoId(null)}
            className="absolute top-4 right-4 z-30 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <X size={20} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

export default KrishiShorts;
