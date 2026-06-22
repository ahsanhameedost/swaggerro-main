import Footer from "@/app/components/home/Footer";
import HomeNavbar from "@/app/components/home/HomeNavbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <HomeNavbar />
            {children}
            <Footer />
        </>
    );
}