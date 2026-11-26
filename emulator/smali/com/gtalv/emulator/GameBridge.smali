.class public Lcom/gtalv/emulator/GameBridge;
.super Ljava/lang/Object;
.source "GameBridge.java"

.field private final activity:Landroid/app/Activity;

.method public constructor <init>(Landroid/app/Activity;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/gtalv/emulator/GameBridge;->activity:Landroid/app/Activity;
    return-void
.end method

.method public exitApp()V
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .locals 1

    iget-object v0, p0, Lcom/gtalv/emulator/GameBridge;->activity:Landroid/app/Activity;
    invoke-virtual {v0}, Landroid/app/Activity;->finish()V
    return-void
.end method

.method public hide()V
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .locals 2

    iget-object v0, p0, Lcom/gtalv/emulator/GameBridge;->activity:Landroid/app/Activity;
    const/4 v1, 0x1
    invoke-virtual {v0, v1}, Landroid/app/Activity;->moveTaskToBack(Z)Z
    return-void
.end method
