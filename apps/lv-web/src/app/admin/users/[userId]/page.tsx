interface Props {
    params: {
        userId: string;
    }
}

export default function AdminUserDetailPage({ params }: Props) {
    return <div>Admin - User {params.userId}</div>;
}

