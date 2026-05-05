//
//  BlowScene.h
//  NarutoJutsusOnHand
//
//  Created by Hitoshi Yanaguibashi on 13/04/15.
//  Copyright 2015 Apportable. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "cocos2d.h"
#import <AVFoundation/AVFoundation.h>
#import <CoreAudio/CoreAudioTypes.h>
#import "cocos2d-ui.h"
#import "Util.h"
#import "CCAnimation.h"
#import <CoreMotion/CoreMotion.h>


#define kPARTICLE_STATE_STANDBY 0
#define kPARTICLE_STATE_ACTIVE 1

@interface BlowScene : CCScene {
    int powerType;
    CCParticleSystem *mainParticle;
    BOOL isReady;
    CCButton *back;
    CCButton *info;
    BOOL isTouching;
    NSMutableDictionary *particleDictionary;
    int particleState;
    NSTimer *selectorTimer;
    BOOL isFirstTime;
    
    //MIC BLOw
    AVAudioRecorder *recorder;
    NSTimer *levelTimer;
    double lowPassResults;
}

- (void)levelTimerCallback:(NSTimer *)timer;

+(BlowScene *) scene;
-(id) initWithParticle:(CCParticleSystem *) particle andType:(int) type;
-(void) changeParticleToStandBy;
-(void) changeParticleToActive;
@end
