pub mod groups;
pub mod known_words;
pub mod partners;
pub mod tokens;

pub fn routes(routes: loco_rs::controller::AppRoutes) -> loco_rs::controller::AppRoutes {
    routes
        .add_route(partners::routes())
        .add_route(tokens::routes())
        .add_route(known_words::routes())
        .add_route(known_words::export_routes())
        .add_route(groups::routes())
}
