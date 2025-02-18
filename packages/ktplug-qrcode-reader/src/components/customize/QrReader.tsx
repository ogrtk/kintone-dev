import { Html5QrcodeScanner } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import "@ogrtk/shared-styles";

const READER_ELEMENT_ID = "qr-reader";

const sleep = async (msec: number) => {
  return new Promise((resolve) => setTimeout(resolve, msec));
};

/**
 * QRコード読み取り後の処理の型
 */
export type QrReadedAction = (decodedText: string) => void | Promise<void>;

/**
 * QRコードリーダーのパラメータの型
 */
type QrReaderProps = {
  size: {
    height: string;
    width: string;
  };
  action: QrReadedAction;
  autoStart: boolean;
};

/**
 * QRコードリーダー
 * @param param0 設定情報
 * @param param0.size QRコード読取時のカメラ表示エリアのサイズ設定
 * @param param0.size.heigt 高さ
 * @param param0.size.width 幅
 * @param param0.action 読み取り後の処理（コールバック）
 * @param param0.autoStart 読み取りを自動で開始する
 * @returns
 */
export function QrReader({ size, action, autoStart }: QrReaderProps) {
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState(
    autoStart ? "読み取り停止" : "読み取り開始",
  );
  const [readerDisplay, setReaderDisplay] = useState<"none" | "block">("none");
  const scannerRef = useRef<Html5QrcodeScanner | undefined>(undefined); // ✅ useRef を使用

  /**
   * QRコードスキャナーを画面表示
   */
  const renderReader = useCallback((action: QrReadedAction) => {
    setMessage("QRコードをカメラにかざしてください。");
    setReaderDisplay("block");
    setButtonLabel("読み取り停止");

    // QRコードスキャナのインスタンス化
    scannerRef.current = new Html5QrcodeScanner(
      READER_ELEMENT_ID,
      { fps: 10, qrbox: { height: 250, width: 250 } },
      false,
    );

    // QRコードスキャナを画面表示
    scannerRef.current.render(
      async (decodedText, _decodedResult) => {
        await action(decodedText);
        await clearReader(true);
      },
      (error) => {
        console.warn(`QR Code scan error: ${error}`);
        setMessage(`読み取りエラーが発生しました。(${error})`);
      },
    );
  }, []);

  /**
   * QRコードスキャナーをクリア
   */
  const clearReader = useCallback(async (readed = false) => {
    while (true) {
      if (!scannerRef.current) return;
      try {
        await scannerRef.current.clear();
        await sleep(1000);
        scannerRef.current = undefined;
        break;
      } catch (e) {
        console.warn("retry clearing");
      }
    }

    if (readed) {
      setMessage("読み取りに成功しました。");
    } else {
      setMessage("");
    }
    setReaderDisplay("none");
    setButtonLabel("読み取り開始");
  }, []);

  /**
   * QRコードスキャナー表示を切り替え
   */
  const toggleQrReader = useCallback(async () => {
    if (scannerRef.current) {
      await clearReader(false);
    } else {
      renderReader(action);
    }
  }, [action, renderReader, clearReader]);

  /**
   * 初期表示時、autoStartが指定されていれば起動
   */
  useEffect(() => {
    if (autoStart) renderReader(action);
  }, [renderReader, action, autoStart]);

  /**
   * 読み取り開始・読み取り停止ボタン押下時の処理
   * （処理中はボタンを無効化する）
   */
  const onbtnClick = async () => {
    await toggleQrReader();
  };

  return (
    <>
      <button
        type="button"
        onClick={onbtnClick}
        className="kintoneplugin-button-normal"
      >
        {buttonLabel}
      </button>

      <output className="message-normal message-large">{message}</output>

      <div
        role="application"
        aria-label="QRコードスキャナー"
        id={READER_ELEMENT_ID}
        style={{
          width: size.width,
          height: size.height,
          display: readerDisplay,
        }}
      />
    </>
  );
}
