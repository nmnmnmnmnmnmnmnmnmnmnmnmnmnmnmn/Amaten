import { Header } from "../components/Header";
import { HeaderBottom } from "../components/HeaderBottom";
import Head from "next/head";
import { useRouter } from "next/router";
import styles from "../styles/id.module.css";
import { Footer } from "../components/Footer";
import { useEffect, useState, useRef } from "react";
import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../components/firebase";
import { addDoc, collection, doc, getDoc, setDoc } from "firebase/firestore";

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

const Product = () => {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [name, setName] = useState("");
  const [img, setImg] = useState("");
  const [price, setPrice] = useState(0);
  const [caption, setCaption] = useState("");
  const [url, setUrl] = useState("");
  const [notFound, setNotFound] = useState("Found");
  const [loading, setLoading] = useState(true);

  // id が[id].jsxだから？？　動的ルーティングになってる
  const { id } = router.query;
  console.log(id);

  //商品詳細ページデータを取得。idで発火
  useEffect(() => {
    const fetchProductData = async () => {
      console.log("useEffect内");
      console.log(id);
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        //ユーザがいれば
        if (user) {
          setUser("user");
        }
      });
      //try finally については知らん、これは、setLoadingのためには必要（？）のはず。

      setLoading(true); // Set loading state to true when fetching starts
      //楽天api呼び出し、ifはデバックで使っただけで、多分いらん
      if (id) {
        const res = await fetch(
          `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?applicationId=1056567340057185285&itemCode=${id}`
        );
        //ふぇっち後、400がかえって来たらnotFound。　それ以外の時は、のちのちで ps urlの数字の部分を削ると　正しくフェッチできてないのに200が返る問題あり
        console.log(res);
        console.log(res.status);
        // if (res.status === 400) {
        if (res.status === 400) {
          setNotFound("notFound");
          //elifで　=== 200でいいかも
        } else {
          const productData = await res.json();
          if (!productData.Items[0]) {
            setNotFound("notFound");
          } else {
            setNotFound("Found");
            setPrice(productData.Items[0].Item.itemPrice);
            setName(productData.Items[0].Item.itemName);
            setImg(productData.Items[0].Item.mediumImageUrls[0].imageUrl);
            setCaption(productData.Items[0].Item.itemCaption);
            setUrl(window.location.href);
            //ロード完了
            setLoading(false); // Set loading state to false when fetching completes
          }
        }
      } else {
        //バグってたらこれが出る
        console.error("id is undefined");
      }
    };
    fetchProductData();
  }, [id]);

  useEffect(() => {
    // Check to see if this is a redirect back from Checkout
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      console.log("Order placed! You will receive an email confirmation.");
    }

    if (query.get("canceled")) {
      console.log(
        "Order canceled -- continue to shop around and checkout when you’re ready."
      );
    }
  }, []);

  //カートボタンハンドル　dbにここで書き込む。　カートの数機能はcontextを使うべきか？
  const handleCart = () => {
    const now = new Date();
    const time = now.getTime();
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      //ユーザがいれば
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const uid = user.uid;
      // checkouts コレクションを作成
      const cartsRef = collection(db, "users", uid, "carts");

      // checkouts コレクションにデータを追加
      try {
        const cartData = {
          //必要なデータを置いていく
          name,
          price,
          img,
          url,
          time,
        };
        await addDoc(cartsRef, cartData);
      } catch (e) {
        // エラー処理
        console.log(e);
      }
    });
  };

  return (
    <div className={styles.container}>
      <Head>
        <meta charSet="UTF-8" />
        <title>Amaten</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/Ten.ico" />
      </Head>
      <Header />
      <HeaderBottom />

      {loading && notFound === "Found" ? (
        <div>Loading...</div>
      ) : notFound !== "Found" ? (
        <div>404 | This page could not be found.</div>
      ) : (
        <div>
          <div>商品詳細ページ</div>
          <div className={styles.imgDiv}>
            <img className={styles.img} src={img} alt="" />
            <div className={styles.name}>{name}</div>
          </div>

          <div>{price}円</div>

          {user ? (
            <>
              <form action="/api/checkout_sessions" method="POST">
                <input type="hidden" name="price" value={price} />
                <input type="hidden" name="img" value={img} />
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="url" value={url} />

                <section className={styles.section}>
                  <button className={styles.button} type="submit" role="link">
                    Checkout
                  </button>
                </section>
              </form>
            </>
          ) : (
            <div>
              <section className={styles.section}>
                <button
                  className={styles.button}
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                >
                  Checkout
                </button>
              </section>
            </div>
          )}

          {/* <input type="hidden" name="price" value={price} />
          <input type="hidden" name="img" value={img} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="url" value={url} /> */}
          <div className={styles.carter}>
            <section className={styles.section}>
              <button
                method="POST"
                onClick={() => {
                  handleCart();
                }}
                className={styles.button}
                role="link"
              >
                カートに追加
              </button>
            </section>
          </div>
          <div>{caption}</div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Product;
