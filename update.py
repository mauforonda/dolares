#!/usr/bin/env python3

import json
import statistics
import time
from urllib import request, error
import socket
from datetime import datetime
from zoneinfo import ZoneInfo
import csv

timezone = "America/La_Paz"
fiat = "BOB"
asset = "USDT"


def checkPrices(fiat, asset, tradeType, rows=20, max_retries=3, timeout=10):
    def makeParameters(fiat, asset, tradeType, page, rows):
        return {
            "fiat": fiat,
            "page": page,
            "rows": rows,
            "tradeType": tradeType,
            "asset": asset,
            "countries": [],
            "proMerchantAds": False,
            "shieldMerchantAds": False,
            "filterType": "all",
            "periods": [],
            "additionalKycVerifyFilter": 0,
            "publisherType": None,
            "payTypes": [],
            "classifies": [
                "mass",
                "profession",
                "fiat_trade",
            ],
            "tradedWith": False,
            "followed": False,
        }

    def makeRequest(url, data, retry_count=0):
        try:
            req = request.Request(
                url, data=data, headers={"Content-Type": "application/json"}
            )
            with request.urlopen(req, timeout=timeout) as response:
                if response.getcode() == 200:
                    return json.loads(response.read().decode())
                else:
                    raise Exception(f"HTTP error {response.getcode()}")
        except (error.URLError, socket.timeout) as e:
            if retry_count < max_retries:
                wait_time = 2**retry_count
                print(f"Request failed. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                return makeRequest(url, data, retry_count + 1)
            else:
                raise Exception(f"Max retries reached. Last error: {str(e)}")

    def mode(prices):
        counts = {}
        for i in prices:
            counts[i] = counts.get(i, 0) + 1
        return max(counts, key=counts.get)

    def identifyOutliers(ads, prices):
        def formatFloat(i):
            return round(float(i), 2)

        def formatOutlier(outlier):
            return dict(
                price=formatFloat(outlier["adv"]["price"]),
                tradable=formatFloat(outlier["adv"]["tradableQuantity"]),
                min_amount=formatFloat(outlier["adv"]["minSingleTransAmount"]),
                max_amount=formatFloat(outlier["adv"]["maxSingleTransAmount"]),
                advertiser_id=outlier["advertiser"]["userNo"],
                advertiser_name=outlier["advertiser"]["nickName"],
                orders=int(outlier["advertiser"]["monthOrderCount"]),
                finish_rate=formatFloat(outlier["advertiser"]["monthFinishRate"]),
                positive_feedback=formatFloat(outlier["advertiser"]["positiveRate"]),
            )

        outliers = []
        sorted_prices = sorted(prices)
        q = (len(sorted_prices) + 1) // 4
        bound = sorted_prices[q] - (1.5 * (sorted_prices[q * 3] - sorted_prices[q]))
        outlier_prices = [i for i in sorted_prices if i < bound]
        if outlier_prices:
            for price in outlier_prices:
                outliers.extend(
                    [formatOutlier(ad) for ad in ads if ad["adv"]["price"] == price]
                )
        return outliers

    page = 1
    ads = []

    while True:
        params = makeParameters(fiat, asset, tradeType, page, rows)
        data = json.dumps(params).encode("utf-8")

        response_data = makeRequest(
            "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", data
        )

        ads.extend(response_data["data"])
        print(f"{tradeType}: page {page} : {len(ads)} / {response_data['total']} ads")
        if len(ads) >= response_data["total"]:
            break
        else:
            page += 1

    prices = [float(ad["adv"]["price"]) for ad in ads]
    tradable = [float(ad["adv"]["tradableQuantity"]) for ad in ads]
    total = sum(tradable)

    if tradeType == "BUY":
        outliers = identifyOutliers(ads, prices)
    else:
        outliers = []

    return (
        dict(
            low=min(prices),
            high=max(prices),
            median=statistics.median(prices),
            vwap=sum([price * quantity for price, quantity in zip(prices, tradable)])
            / sum(tradable),  # volume weighted aveage price
            naive=mode(
                prices[: len(prices) // 10]
            ),  # the mode among the bottom (BUY) or top (SELL) decile
        ),
        dict(
            offers=len(prices),
            tradable=sum(tradable),
            herfindahl_hirschman=sum([(i / total) ** 2 for i in tradable]) * 100,
        ),
        outliers,
    )


def appendFile(filename, rows):
    file_exists = True
    try:
        with open(filename, "r") as f:
            pass
    except FileNotFoundError:
        file_exists = False

    with open(filename, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        if not file_exists:
            writer.writeheader()
        for row in rows:
            writer.writerow(row)


def appendPrices(prices, filename, timestamp):
    row = {**{"timestamp": timestamp}, **{i[0]: round(i[1], 2) for i in prices.items()}}
    appendFile(filename, [row])


def appendOutliers(outliers, filename, timestamp):
    rows = [{**{"timestamp": timestamp}, **outlier} for outlier in outliers]
    appendFile(filename, rows)


for tradeType in ["BUY", "SELL"]:
    try:
        start = time.time()
        timestamp = datetime.now(ZoneInfo(timezone)).isoformat(timespec="minutes")
        prices, geek_indicators, outliers = checkPrices(fiat=fiat, asset=asset, tradeType=tradeType)
        appendPrices(prices, f"{tradeType.lower()}.csv", timestamp)
        appendPrices(geek_indicators, f"{tradeType.lower()}_extra.csv", timestamp)
        if outliers:
            appendOutliers(outliers, "buyside_low_outliers.csv", timestamp)
        print(f"{tradeType}: {time.time() - start:.2f} seconds")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        raise
