import { SiteFooter } from "@/components/site/site-footer";
import HomeNavbar from "@/app/components/home/HomeNavbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <HomeNavbar />
            {children}
            <SiteFooter />
        </>
    );
}