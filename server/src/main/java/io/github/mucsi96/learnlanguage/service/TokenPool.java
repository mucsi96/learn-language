package io.github.mucsi96.learnlanguage.service;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.IntSupplier;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class TokenPool {

    private static final long MINUTE_MS = 60_000L;

    private final ReentrantLock lock = new ReentrantLock(true);
    private final Condition tokenAvailable = lock.newCondition();
    private final IntSupplier maxConcurrentSupplier;
    private final IntSupplier maxPerMinuteSupplier;
    private final String name;

    private int activeTokens = 0;
    private int distributedThisMinute = 0;
    private long minuteWindowStart = 0;

    public TokenPool(String name, IntSupplier maxConcurrentSupplier, IntSupplier maxPerMinuteSupplier) {
        this.name = name;
        this.maxConcurrentSupplier = maxConcurrentSupplier;
        this.maxPerMinuteSupplier = maxPerMinuteSupplier;
    }

    public void acquire() throws InterruptedException {
        lock.lock();
        try {
            while (true) {
                final int maxConcurrent = maxConcurrentSupplier.getAsInt();
                final int maxPerMinute = maxPerMinuteSupplier.getAsInt();

                if (activeTokens >= maxConcurrent) {
                    log.debug("{}: waiting for concurrent slot ({}/{})", name, activeTokens, maxConcurrent);
                    tokenAvailable.await();
                    continue;
                }

                final long now = System.currentTimeMillis();
                if (now - minuteWindowStart >= MINUTE_MS) {
                    minuteWindowStart = now;
                    distributedThisMinute = 0;
                }

                if (distributedThisMinute >= maxPerMinute) {
                    final long waitTime = MINUTE_MS - (now - minuteWindowStart);
                    log.debug("{}: per-minute limit reached ({}/{}), waiting {}ms", name, distributedThisMinute, maxPerMinute, waitTime);
                    if (waitTime > 0) {
                        tokenAvailable.await(waitTime, TimeUnit.MILLISECONDS);
                    }
                    continue;
                }

                activeTokens++;
                distributedThisMinute++;
                log.debug("{}: token acquired (active: {}/{}, minute: {}/{})", name, activeTokens, maxConcurrent, distributedThisMinute, maxPerMinute);
                break;
            }
        } finally {
            lock.unlock();
        }
    }

    public void release() {
        lock.lock();
        try {
            activeTokens--;
            log.debug("{}: token released (active: {})", name, activeTokens);
            tokenAvailable.signalAll();
        } finally {
            lock.unlock();
        }
    }
}
