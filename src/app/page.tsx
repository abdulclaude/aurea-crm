import { requireUnauth } from "@/lib/auth-utils";

const Home = async () => {
  await requireUnauth();

  return <div> Home </div>;
};

export default Home;
