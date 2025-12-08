import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // Supabaseクライアントのインポート (推測)
import { cookies } from "next/headers";

// カテゴリとICFコードのプレフィックスを対応させる
const icfCategories = {
    "BADL": ["d5", "d4", "b"],
    "IADL": ["d6", "d2"],
    "コミュニケーション": ["d3", "d7"],
    "環境": ["e"],
};

interface CarePlan {
    plan: string;
    icf_codes: string[];
}
interface Recipient {
    name: string | null;
    careplan_icf: CarePlan[] | null;
}

// APIの役割: 指定されたカテゴリのケアプランを検索して返す
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const floor = searchParams.get("floor");
    const category = searchParams.get("category");

    if (!floor || !category) {
        return NextResponse.json({ error: "フロアとカテゴリは必須です。" }, {
            status: 400,
        });
    }

    const typedCategory = category as keyof typeof icfCategories;
    // '発話率' や 'パーソナル' はICFカテゴリではないため除外
    if (!icfCategories[typedCategory]) {
        return NextResponse.json({});
    }

    const cookieStore = cookies(); // Next.jsからサーバーコンポーネントのクッキーストアを取得
    const supabase = await createClient();

    try {
        const lackingIcfPrefixes = icfCategories[typedCategory];

        const { data: recipients, error: recipientError } = await supabase
            .from("care_recipient")
            .select("name, careplan_icf")
            .eq("floor", floor);

        if (recipientError) throw recipientError;

        const relatedPlans: { recipient_name: string; plan_text: string }[] =
            [];
        recipients?.forEach((r: Recipient) => {
            r.careplan_icf?.forEach((p: CarePlan) => {
                if (
                    p.icf_codes.some((code) =>
                        lackingIcfPrefixes.some((prefix) =>
                            code.startsWith(prefix)
                        )
                    )
                ) {
                    relatedPlans.push({
                        recipient_name: r.name || "名前不明",
                        plan_text: p.plan,
                    });
                }
            });
        });

        // ダミーデータ（関連プランがなかった場合）
        if (relatedPlans.length === 0) {
            const dummyPlanMap: { [key: string]: string } = {
                "IADL": "例：買い物支援、服薬管理",
                "BADL": "例：食事介助、入浴の支援",
                "コミュニケーション": "例：他者との会話機会の創出",
                "環境": "例：居室の環境整備、手すりの設置",
            };
            relatedPlans.push({
                recipient_name: "（関連する利用者なし）",
                plan_text: dummyPlanMap[typedCategory] ||
                    "関連するケアプランの例",
            });
        }

        const groupedByRecipient: {
            [key: string]: { category: string; plan: string }[];
        } = {};
        relatedPlans.forEach((plan) => {
            const recipientName = plan.recipient_name;
            if (!groupedByRecipient[recipientName]) {
                groupedByRecipient[recipientName] = [];
            }
            groupedByRecipient[recipientName].push({
                category: typedCategory,
                plan: plan.plan_text,
            });
        });

        return NextResponse.json(groupedByRecipient);
    } catch (error: any) {
        console.error("Feedback suggestion error:", error);
        return NextResponse.json({
            error: `処理中にエラーが発生しました: ${error.message}`,
        }, { status: 500 });
    }
}
